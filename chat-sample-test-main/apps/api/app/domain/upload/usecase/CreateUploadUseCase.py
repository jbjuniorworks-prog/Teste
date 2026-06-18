from datetime import datetime, timezone
from uuid import UUID, uuid4

from app.domain.upload.UploadStorage import UploadStorage
from app.domain.upload.model.Upload import Upload
from app.domain.upload.repository.UploadRepository import UploadRepository


class CreateUploadUseCase:
    """Stores the bytes in storage and the metadata in the database, as a single unit."""

    def __init__(self, uploads: UploadRepository, storage: UploadStorage) -> None:
        self._uploads = uploads
        self._storage = storage

    async def execute(
        self, *, user_id: UUID, filename: str, content_type: str, content: bytes
    ) -> Upload:
        upload = Upload(
            id=uuid4(),
            user_id=user_id,
            filename=filename,
            content_type=content_type,
            created_at=datetime.now(timezone.utc),
        )
        await self._storage.save(upload.id, content)
        await self._uploads.save(upload)
        return upload
