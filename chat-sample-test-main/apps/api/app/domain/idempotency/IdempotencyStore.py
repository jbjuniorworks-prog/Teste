from abc import ABC, abstractmethod
from datetime import datetime

from app.domain.idempotency.model.IdempotencyRecord import IdempotencyRecord


class IdempotencyStore(ABC):
    """Durable ledger of idempotency keys (original response stored)."""

    @abstractmethod
    async def get(self, key: str) -> IdempotencyRecord | None:
        ...

    @abstractmethod
    async def begin(self, key: str, fingerprint: str) -> bool:
        """Reserves the key (status in_progress). Returns True if it was inserted now;
        False if it already existed (race / replay)."""
        ...

    @abstractmethod
    async def complete(
        self, key: str, response_status: int, response_body: str, content_type: str
    ) -> None:
        """Writes the final response (status completed)."""
        ...

    @abstractmethod
    async def discard(self, key: str) -> None:
        """Removes the reservation (e.g.: 5xx response -> allows retry)."""
        ...

    @abstractmethod
    async def purge_stale(
        self, in_progress_before: datetime, completed_before: datetime
    ) -> int:
        """Deletes orphaned in_progress (created before `in_progress_before`) and
        old completed (beyond `completed_before`). Returns how many."""
        ...
