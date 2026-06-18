from abc import ABC, abstractmethod
from collections.abc import AsyncIterator
from typing import Any
from uuid import UUID


class ChatEventStream(ABC):
    """Live transport for a run's events (backed by a Redis Stream).

    Append-only with IDs: a late subscriber replays from the start and follows
    live — that's what makes "I left the screen and came back" possible.
    """

    @abstractmethod
    async def append(self, run_id: UUID, event: dict[str, Any]) -> str:
        """Appends an event; returns the entry id (used as the SSE id)."""
        ...

    @abstractmethod
    def subscribe(
        self, run_id: UUID, *, after: str | None = None
    ) -> AsyncIterator[tuple[str, dict[str, Any]]]:
        """Iterates (entry_id, event): catches up from `after` (or from the
        start) and follows live until the `done` sentinel event."""
        ...

    @abstractmethod
    async def mark_done(self, run_id: UUID) -> None:
        """Marks the end of the run (sentinel) and schedules stream expiration."""
        ...

    @abstractmethod
    async def exists(self, run_id: UUID) -> bool: ...

    # Pointer to a chat's active run (for reattach after a "hard" reload).
    @abstractmethod
    async def set_active(self, chat_id: UUID, run_id: UUID) -> None: ...

    @abstractmethod
    async def get_active(self, chat_id: UUID) -> UUID | None: ...

    @abstractmethod
    async def clear_active(self, chat_id: UUID) -> None: ...
