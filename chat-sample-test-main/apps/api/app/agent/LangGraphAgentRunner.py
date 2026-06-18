"""Concrete AgentRunner over LangGraph + astream_events.

Translates the graph's events into domain RunEvents and **labels the owner** of
each event by run ancestry (the `parent_ids` field of astream_events v2): if an
ancestor is the `delegate_to_subagent` tool, the event belongs to a subagent.
That way the upper layer knows to collapse the subagent (only start/result) on
persistence.
"""

import hashlib
import json
from collections.abc import AsyncIterator
from typing import Annotated, Any, TypedDict
from uuid import UUID

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from langchain_core.tools import BaseTool, InjectedToolCallId, tool
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_openai import ChatOpenAI

from app.agent.graph import build_agent, message_text
from app.core.config import settings
from app.core.llm_http import llm_async_http_client, llm_http_client
from app.domain.chat.AgentRunner import AgentRunner
from app.domain.chat.model.RunEvent import RunEvent
from app.domain.chat.model.constants import SUPERVISOR, EventType
from app.domain.chat.model.constants import MessageRole

_DELEGATE_TOOL = "delegate_to_subagent"
_MUTATING_TOOLS = {"create_user", "update_user", "delete_user", "generate_user_report"}


class _UserRow(TypedDict):
    name: str
    email: str
    role: str


def _idem_key(run_id: UUID, tool_call_id: str) -> str:
    # Stable across replays: the boundary step's tool_call_id comes from the checkpoint.
    return hashlib.sha256(f"{run_id}:{tool_call_id}".encode()).hexdigest()


class LangGraphAgentRunner(AgentRunner):
    def __init__(self, checkpointer=None) -> None:
        # checkpointer (AsyncRedisSaver) optional: enables resume by thread_id.
        self._checkpointer = checkpointer

    def _model(self) -> ChatOpenAI:
        return ChatOpenAI(
            model=settings.AGENT_MODEL,
            api_key=settings.OPENAI_API_KEY,
            http_client=llm_http_client(),
            http_async_client=llm_async_http_client(),
        )

    def _mcp_client(self, ephemeral_token: str) -> MultiServerMCPClient:
        return MultiServerMCPClient(
            {
                "chat-sample": {
                    "transport": "streamable_http",
                    "url": settings.MCP_URL,
                    "headers": {"Authorization": f"Bearer {ephemeral_token}"},
                }
            }
        )

    async def run(
        self,
        *,
        run_id: UUID,
        ephemeral_token: str,
        message: str,
        history: list[tuple[str, str]],
        attachment_ids: list[UUID] | None = None,
    ) -> AsyncIterator[RunEvent]:
        tools = await self._mcp_client(ephemeral_token).get_tools()
        tools = self._with_idempotency(tools, run_id)
        agent = build_agent(self._model(), tools, checkpointer=self._checkpointer)
        # thread_id = run_id: on reprocessing, the supervisor resumes from the checkpoint.
        config = {"configurable": {"thread_id": str(run_id)}}

        # If there is already a checkpoint for this run -> RESUME (input None continues
        # from where it stopped). Resending the messages would corrupt the state
        # (tool_calls without a response).
        resuming = False
        if self._checkpointer is not None:
            resuming = await self._checkpointer.aget_tuple(config) is not None
        inputs = (
            None
            if resuming
            else {"messages": [*self._to_lc(history),
                               *self._attachment_notes(attachment_ids),
                               HumanMessage(content=message)]}
        )

        sub_labels: dict[str, str] = {}   # delegate's run_id -> "subagent:N"
        sub_counter = 0
        final_text = ""
        # The mutating tools are wrapped (idempotency), so astream emits the event on
        # the wrapper AND on the inner MCP tool. We keep the wrappers' run_ids to
        # ignore the nested inner call (otherwise it shows up twice).
        wrapper_runs: set[str] = set()

        async for ev in agent.astream_events(inputs, version="v2", config=config):
            kind = ev["event"]
            name = ev.get("name")
            run_id = ev.get("run_id")
            parents = ev.get("parent_ids") or []
            data = ev.get("data") or {}
            owner = self._owner(run_id, parents, sub_labels)

            if kind == "on_tool_start":
                if name == _DELEGATE_TOOL:
                    sub_counter += 1
                    label = f"subagent:{sub_counter}"
                    sub_labels[run_id] = label
                    task = self._tool_input(data).get("task", "")
                    yield RunEvent(EventType.SUBAGENT_START, SUPERVISOR,
                                   {"label": label, "task": task})
                elif name in _MUTATING_TOOLS:
                    # ignore the inner MCP call (nested under the wrapper).
                    if any(p in wrapper_runs for p in parents):
                        continue
                    wrapper_runs.add(run_id)
                    yield RunEvent(EventType.TOOL_CALL, owner,
                                   {"name": name, "args": self._tool_input(data)})
                else:
                    yield RunEvent(EventType.TOOL_CALL, owner,
                                   {"name": name, "args": self._tool_input(data)})

            elif kind == "on_tool_end":
                if run_id in sub_labels:
                    yield RunEvent(EventType.SUBAGENT_RESULT, SUPERVISOR,
                                   {"label": sub_labels[run_id],
                                    "result": self._tool_output(data)})
                elif name in _MUTATING_TOOLS:
                    if run_id not in wrapper_runs:
                        continue  # end of the inner call -> ignore
                    yield RunEvent(EventType.TOOL_RESULT, owner,
                                   {"name": name, "content": self._tool_output(data)})
                else:
                    yield RunEvent(EventType.TOOL_RESULT, owner,
                                   {"name": name, "content": self._tool_output(data)})

            elif kind == "on_chat_model_stream":
                text = self._chunk_text(data.get("chunk"))
                if text:
                    yield RunEvent(EventType.TOKEN, owner, {"text": text})

            elif kind == "on_chat_model_end":
                msg = data.get("output")
                tool_calls = getattr(msg, "tool_calls", None) or []
                text = message_text(msg) if msg is not None else ""
                if owner == SUPERVISOR:
                    if tool_calls:
                        yield RunEvent(EventType.ASSISTANT_STEP, SUPERVISOR,
                                       {"text": text,
                                        "tool_calls": [tc["name"] for tc in tool_calls]})
                    elif text:
                        final_text = text  # last turn without a tool = final response

        yield RunEvent(EventType.ASSISTANT_FINAL, SUPERVISOR,
                       {"text": final_text, "meta": {"model": settings.AGENT_MODEL}})

    # --- idempotency: hides idempotency_key from the LLM and injects the stable key ---

    def _with_idempotency(self, tools: list[BaseTool], run_id: UUID) -> list[BaseTool]:
        wrappers = {
            "create_user": self._wrap_create,
            "update_user": self._wrap_update,
            "delete_user": self._wrap_delete,
            "generate_user_report": self._wrap_user_report,
        }
        return [
            wrappers[t.name](t, run_id) if t.name in _MUTATING_TOOLS else t
            for t in tools
        ]

    @staticmethod
    def _wrap_create(underlying: BaseTool, run_id: UUID) -> BaseTool:
        @tool("create_user", description=underlying.description)
        async def create_user(
            name: str,
            email: str,
            password: str,
            role_id: str,
            tool_call_id: Annotated[str, InjectedToolCallId],
        ) -> Any:
            return await underlying.ainvoke({
                "name": name, "email": email, "password": password, "role_id": role_id,
                "idempotency_key": _idem_key(run_id, tool_call_id),
            })

        return create_user

    @staticmethod
    def _wrap_update(underlying: BaseTool, run_id: UUID) -> BaseTool:
        @tool("update_user", description=underlying.description)
        async def update_user(
            user_id: str,
            tool_call_id: Annotated[str, InjectedToolCallId],
            name: str | None = None,
            email: str | None = None,
            password: str | None = None,
            role_id: str | None = None,
        ) -> Any:
            return await underlying.ainvoke({
                "user_id": user_id, "name": name, "email": email,
                "password": password, "role_id": role_id,
                "idempotency_key": _idem_key(run_id, tool_call_id),
            })

        return update_user

    @staticmethod
    def _wrap_delete(underlying: BaseTool, run_id: UUID) -> BaseTool:
        @tool("delete_user", description=underlying.description)
        async def delete_user(
            user_id: str,
            tool_call_id: Annotated[str, InjectedToolCallId],
        ) -> Any:
            return await underlying.ainvoke({
                "user_id": user_id,
                "idempotency_key": _idem_key(run_id, tool_call_id),
            })

        return delete_user

    @staticmethod
    def _wrap_user_report(underlying: BaseTool, run_id: UUID) -> BaseTool:
        @tool("generate_user_report", description=underlying.description)
        async def generate_user_report(
            users: list[_UserRow],
            tool_call_id: Annotated[str, InjectedToolCallId],
            title: str = "User Report",
        ) -> Any:
            return await underlying.ainvoke({
                "users": users,
                "title": title,
                "idempotency_key": _idem_key(run_id, tool_call_id),
            })

        return generate_user_report

    # --- helpers ---

    @staticmethod
    def _attachment_notes(attachment_ids: list[UUID] | None) -> list[BaseMessage]:
        # Nudge: tells the agent about the attachments and which tool to use. It decides to call.
        if not attachment_ids:
            return []
        ids = ", ".join(str(aid) for aid in attachment_ids)
        return [
            SystemMessage(
                content=(
                    f"The user attached document(s) with upload_id(s): {ids}. "
                    "If they ask to compare the document's user list with the system, "
                    "use the `compare_user_lists` tool passing the upload_id."
                )
            )
        ]

    @staticmethod
    def _to_lc(history: list[tuple[str, str]]) -> list[BaseMessage]:
        return [
            AIMessage(content=content)
            if role == MessageRole.ASSISTANT
            else HumanMessage(content=content)
            for role, content in history
        ]

    @staticmethod
    def _owner(run_id, parents: list, sub_labels: dict[str, str]) -> str:
        for rid in (run_id, *parents):
            label = sub_labels.get(rid)
            if label is not None:
                return label
        return SUPERVISOR

    @staticmethod
    def _tool_input(data: dict) -> dict:
        value = data.get("input")
        return value if isinstance(value, dict) else {"input": value}

    @staticmethod
    def _tool_output(data: Any) -> Any:
        output = data.get("output") if isinstance(data, dict) else data
        if hasattr(output, "content"):
            output = output.content
        if isinstance(output, str):
            try:
                return json.loads(output)   # MCP returns JSON -> store it structured
            except (ValueError, TypeError):
                return output
        if isinstance(output, (int, float, bool, dict, list)) or output is None:
            return output
        return str(output)

    @staticmethod
    def _chunk_text(chunk) -> str:
        return message_text(chunk) if chunk is not None else ""
