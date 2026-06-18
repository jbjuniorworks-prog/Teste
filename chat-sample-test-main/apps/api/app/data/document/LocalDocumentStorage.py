from pathlib import Path
from uuid import UUID

from app.core.config import settings
from app.domain.document.DocumentStorage import DocumentStorage


class LocalDocumentStorage(DocumentStorage):
    """Saves to disk (volume). In the real app, swap for GcsDocumentStorage."""

    def __init__(self) -> None:
        self._dir = Path(settings.DOCUMENTS_DIR)
        self._dir.mkdir(parents=True, exist_ok=True)

    def _path(self, document_id: UUID) -> Path:
        return self._dir / f"{document_id}.pdf"

    async def save(self, document_id: UUID, content: bytes) -> None:
        self._path(document_id).write_bytes(content)

    async def load(self, document_id: UUID) -> bytes | None:
        path = self._path(document_id)
        return path.read_bytes() if path.exists() else None

    def url(self, document_id: UUID) -> str:
        return f"/documents/{document_id}"
