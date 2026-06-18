from abc import ABC, abstractmethod
from uuid import UUID


class DocumentStorage(ABC):
    """Where generated PDFs live. Local in the PoC; GCS in the real app (same port)."""

    @abstractmethod
    async def save(self, document_id: UUID, content: bytes) -> None:
        ...

    @abstractmethod
    async def load(self, document_id: UUID) -> bytes | None:
        ...

    @abstractmethod
    def url(self, document_id: UUID) -> str:
        """URL to access the document (local: API route; GCS: signed URL)."""
        ...
