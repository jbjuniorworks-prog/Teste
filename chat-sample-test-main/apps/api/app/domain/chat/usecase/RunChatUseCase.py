import logging
from datetime import datetime, timezone
from uuid import UUID, uuid4

from app.domain.chat.AgentRunner import AgentRunner
from app.domain.chat.ChatEventStream import ChatEventStream
from app.domain.chat.ChatTitler import ChatTitler
from app.domain.chat.model.MessageEvent import MessageEvent
from app.domain.chat.model.constants import (
    DEFAULT_CHAT_TITLE,
    MAX_TITLE_ATTEMPTS,
    SUPERVISOR,
    EventType,
    MessageRole,
    MessageStatus,
)
from app.domain.chat.repository.ChatRepository import ChatRepository
from app.domain.token.usecase.IssueEphemeralTokenUseCase import (
    IssueEphemeralTokenUseCase,
)

logger = logging.getLogger(__name__)


class RunChatUseCase:
    """Runs the agent in the background: emits live events on the stream (Redis)
    and, at the end, persists the curated process (no tokens; subagent collapsed)
    + the final message in Postgres. Nothing goes to the database during
    processing.
    """

    def __init__(
        self,
        chats: ChatRepository,
        stream: ChatEventStream,
        runner: AgentRunner,
        token_issuer: IssueEphemeralTokenUseCase,
        titler: ChatTitler,
    ) -> None:
        self._chats = chats
        self._stream = stream
        self._runner = runner
        self._token_issuer = token_issuer
        self._titler = titler

    async def execute(
        self,
        *,
        user_id: UUID,
        chat_id: UUID,
        user_message_id: UUID,
        run_id: UUID,
        message: str,
        attachment_ids: list[UUID] | None = None,
    ) -> None:
        history = await self._load_history(chat_id, user_message_id, run_id)
        token = await self._token_issuer.execute(user_id)

        curated: list[MessageEvent] = []
        final_text = ""
        meta: dict = {}
        seq = 0

        try:
            async for ev in self._runner.run(
                run_id=run_id,
                ephemeral_token=token,
                message=message,
                history=history,
                attachment_ids=attachment_ids,
            ):
                # 1) everything (incl. tokens and subagent internals) goes live.
                await self._stream.append(
                    run_id, {"type": ev.type, "owner": ev.owner, "payload": ev.payload}
                )

                # 2) the final text assembles the message (not a persisted event).
                if ev.type == EventType.ASSISTANT_FINAL:
                    final_text = ev.payload.get("text", "")
                    meta = ev.payload.get("meta", {})
                    continue

                # 3) curated for the database: only supervisor + persistable types
                #    (subagent_start/result go in; subagent internals don't).
                if ev.owner == SUPERVISOR and ev.type in EventType.PERSISTED:
                    curated.append(self._to_event(chat_id, run_id, seq, ev))
                    seq += 1

            await self._chats.finalize_run(
                run_id=run_id,
                content=final_text,
                status=MessageStatus.COMPLETE,
                error=None,
                meta=meta or None,
                completed_at=datetime.now(timezone.utc),
                events=curated,
            )
            await self._maybe_title(chat_id, run_id)
        except Exception as exc:  # noqa: BLE001 — background run: logs and marks failed
            logger.exception("chat run %s failed", run_id)
            await self._stream.append(
                run_id, {"type": EventType.ERROR, "owner": SUPERVISOR,
                         "payload": {"message": str(exc)}}
            )
            await self._chats.finalize_run(
                run_id=run_id,
                content=final_text or None,
                status=MessageStatus.FAILED,
                error=str(exc),
                meta=meta or None,
                completed_at=datetime.now(timezone.utc),
                events=curated,
            )
        finally:
            await self._stream.mark_done(run_id)
            await self._stream.clear_active(chat_id)

    async def _maybe_title(self, chat_id: UUID, run_id: UUID) -> None:
        """Tries to title the chat (turns 1..MAX). Only acts while the title is
        the default; if the model finds it insufficient, leaves it for later."""
        try:
            chat = await self._chats.get_chat(chat_id)
            if chat is None or chat.title != DEFAULT_CHAT_TITLE:
                return
            messages = await self._chats.get_messages(chat_id)
            user_turns = sum(1 for m in messages if m.role == MessageRole.USER)
            if user_turns > MAX_TITLE_ATTEMPTS:
                return
            convo = [
                (m.role, m.content)
                for m in messages
                if m.content and m.status != MessageStatus.RUNNING
            ]
            title = await self._titler.title(convo)
            if not title:
                return  # insufficient -> try on the next turn
            await self._chats.set_title(chat_id, title)
            await self._stream.append(
                run_id,
                {"type": EventType.TITLE, "owner": SUPERVISOR, "payload": {"title": title}},
            )
        except Exception:  # noqa: BLE001 — titling is best-effort
            logger.exception("titling failed for chat %s", chat_id)

    async def _load_history(
        self, chat_id: UUID, user_message_id: UUID, run_id: UUID
    ) -> list[tuple[str, str]]:
        prior = await self._chats.get_messages(chat_id)
        return [
            (m.role, m.content)
            for m in prior
            if m.id not in (user_message_id, run_id)
            and m.content is not None
            and m.status != MessageStatus.RUNNING
        ]

    def _to_event(
        self, chat_id: UUID, run_id: UUID, seq: int, ev
    ) -> MessageEvent:
        return MessageEvent(
            id=uuid4(),
            chat_id=chat_id,
            message_id=run_id,
            seq=seq,
            type=ev.type,
            owner=ev.owner,
            payload=ev.payload,
            created_at=datetime.now(timezone.utc),
        )
