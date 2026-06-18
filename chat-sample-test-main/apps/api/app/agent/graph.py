"""LangGraph agent assembly (supervisor + subagents for context management).

The agent is a ReAct (`create_react_agent`) whose tools are the Chat Sample MCP
ones, plus ONE special tool — `delegate_to_subagent`. That tool spins up a new
ReAct, with the SAME MCP tools but WITHOUT the delegate tool (cuts recursion),
runs the subtask in isolation and returns **only the final text**.

Why this manages context: all the back-and-forth of the subtask's tool calls
(listing users, finding role_id, paginating, etc.) stays in the subagent's
history and never enters the supervisor's context — which only receives the
condensed result.
"""

from typing import Annotated

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import BaseMessage, HumanMessage
from langchain_core.runnables import RunnableConfig
from langchain_core.tools import BaseTool, InjectedToolCallId, tool
from langgraph.prebuilt import create_react_agent

SUPERVISOR_PROMPT = """\
You are the Chat Sample management assistant. You administer users and roles by \
calling the available tools — never make up data, always look it up or act via a \
tool.

You operate with the permissions of the logged-in user: if an action is denied \
(PERMISSION_DENIED), explain that permission is missing instead of trying to work \
around it.

For multi-step or exploratory subtasks (e.g. "find the role_id of 'admin' and then \
list who has it", or long sweeps/checks), delegate with `delegate_to_subagent`: \
pass a self-contained instruction and use only the result it returns. This keeps \
your context lean. For simple, direct actions, call the MCP tool yourself.

For the User Report PDF, use `generate_user_report` with `users` (a list of \
{name, email, role}). IMPORTANT RULE: the report's users ALWAYS come from \
`list_users` (the system) — NEVER from data the human typed/provided in the \
conversation. If the user asks to include someone who does not exist in the \
system, do not make it up; generate it with the real users. Do NOT include \
links/URLs in your reply — the file shows up on its own in the interface; just \
confirm.

When the user attaches a document and asks to compare the user list with the \
system, use `compare_user_lists` with the given upload_id. The result is already \
the ready-made diff (matched, role mismatch, only in document, only in system) — \
just explain it; do NOT create or change users based on the document.

Respond in English, concisely.\
"""

SUBAGENT_PROMPT = """\
You are a focused subagent. Carry out the SINGLE delegated task using the tools \
and return a concise result — only the information the supervisor needs, without \
narrating the step-by-step or dumping raw payloads. If the task cannot be \
completed (e.g. permission denied), say so clearly in one sentence.\
"""


def message_text(message: BaseMessage) -> str:
    """Extract the text from a message whose `content` may come as a string or
    as a list of blocks (some models return reasoning + text)."""
    content = message.content
    if isinstance(content, str):
        return content
    parts: list[str] = []
    for block in content:
        if isinstance(block, str):
            parts.append(block)
        elif isinstance(block, dict) and block.get("type") == "text":
            parts.append(block.get("text", ""))
    return "\n".join(p for p in parts if p)


def _build_delegate_tool(
    model: BaseChatModel, mcp_tools: list[BaseTool], checkpointer=None
) -> BaseTool:
    @tool
    async def delegate_to_subagent(
        task: str,
        config: RunnableConfig,
        tool_call_id: Annotated[str, InjectedToolCallId],
    ) -> str:
        """Delegate a self-contained subtask to a focused, isolated subagent.

        Use for multi-step or exploratory work, keeping the detail of the tool
        calls out of your context. The `task` argument must be a complete and
        unambiguous instruction (include the needed data). Returns only the
        subagent's final response.
        """
        # `config`/`tool_call_id` are injected by LangChain (outside the LLM schema).
        subagent = create_react_agent(
            model, mcp_tools, prompt=SUBAGENT_PROMPT, checkpointer=checkpointer
        )
        # own thread_id, derived from this delegation's id (stable in the supervisor's
        # checkpoint) -> the subagent is resumable and its tool_call_ids stay stable on
        # replay (the idempotency-key of mutating tools does not change).
        configurable = dict(config.get("configurable") or {})
        configurable["thread_id"] = f"{configurable.get('thread_id', '')}:{tool_call_id}"
        sub_config = {**config, "configurable": configurable}

        inputs: dict | None = {"messages": [HumanMessage(content=task)]}
        if checkpointer is not None and await checkpointer.aget_tuple(sub_config) is not None:
            inputs = None  # resume: continue from the subagent's checkpoint
        result = await subagent.ainvoke(inputs, config=sub_config)
        return message_text(result["messages"][-1])

    return delegate_to_subagent


def build_agent(model: BaseChatModel, mcp_tools: list[BaseTool], checkpointer=None):
    """Assemble the supervisor: MCP tools + the delegation tool for subagents.

    `checkpointer` (optional) persists the state of the supervisor and the
    subagents (each on its own `thread_id`) — on reprocessing, it resumes from
    where it stopped instead of redoing already-completed tool calls."""
    delegate = _build_delegate_tool(model, mcp_tools, checkpointer)
    return create_react_agent(
        model, [*mcp_tools, delegate], prompt=SUPERVISOR_PROMPT, checkpointer=checkpointer
    )
