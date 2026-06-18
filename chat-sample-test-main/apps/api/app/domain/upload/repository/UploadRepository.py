from abc import ABC, abstractmethod
from uuid import UUID

from app.domain.upload.model.Upload import Upload


class UploadRepository(ABC):
    @abstractmethod
    async def save(self, upload: Upload) -> Upload: ...

    @abstractmethod
    async def get(self, upload_id: UUID) -> Upload | None: ...
