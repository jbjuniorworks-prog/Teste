from pathlib import Path
from uuid import UUID

from app.core.config import settings
from app.domain.upload.UploadStorage import UploadStorage


class LocalUploadStorage(UploadStorage):
    """Saves to disk (volume). In the real app, swap for GcsUploadStorage."""

    def __init__(self) -> None:
        self._dir = Path(settings.UPLOADS_DIR)
        self._dir.mkdir(parents=True, exist_ok=True)

    def _path(self, upload_id: UUID) -> Path:
        return self._dir / str(upload_id)

    async def save(self, upload_id: UUID, content: bytes) -> None:
        self._path(upload_id).write_bytes(content)

    async def load(self, upload_id: UUID) -> bytes | None:
        path = self._path(upload_id)
        return path.read_bytes() if path.exists() else None
