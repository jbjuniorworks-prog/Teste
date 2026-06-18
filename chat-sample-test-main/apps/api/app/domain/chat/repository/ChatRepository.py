from abc import ABC, abstractmethod
from datetime import datetime
from uuid import UUID

from app.domain.chat.model.Chat import Chat
from app.domain.chat.model.Message import Message
from app.domain.chat.model.MessageEvent import MessageEvent


class ChatRepository(ABC):
    """Chat aggregate root: covers chats, messages and message_events."""

    @abstractmethod
    async def start_turn(
        self,
        chat: Chat | None,
        user_message: Message,
        assistant_message: Message,
    ) -> None:
        """Creates the chat (if new) + the user message + the assistant one
        (running), in a single transaction. `chat=None` when the chat already
        exists."""
        ...

    @abstractmethod
    async def finalize_run(
        self,
        *,
        run_id: UUID,
        content: str | None,
        status: str,
        error: str | None,
        meta: dict | None,
        completed_at: datetime,
        events: list[MessageEvent],
    ) -> None:
        """Closes the run: updates the assistant message (run_id) and inserts the
        curated events; touches the chat's updated_at. All in one transaction."""
        ...

    @abstractmethod
    async def get_chat(self, chat_id: UUID) -> Chat | None: ...

    @abstractmethod
    async def set_title(self, chat_id: UUID, title: str) -> None: ...

    @abstractmethod
    async def get_chats_by_user(self, user_id: UUID) -> list[Chat]: ...

    @abstractmethod
    async def get_message(self, message_id: UUID) -> Message | None: ...

    @abstractmethod
    async def get_messages(self, chat_id: UUID) -> list[Message]:
        """Chat messages, in chronological order."""
        ...

    @abstractmethod
    async def get_events(self, message_id: UUID) -> list[MessageEvent]:
        """Persisted events of a run, ordered by seq."""
        ...

    @abstractmethod
    async def fail_stale_runs(self, older_than: datetime) -> int:
        """Marks as failed the (assistant) runs still 'running' that were created
        before `older_than`. Safety net for orphaned runs. Returns how many."""
        ...
