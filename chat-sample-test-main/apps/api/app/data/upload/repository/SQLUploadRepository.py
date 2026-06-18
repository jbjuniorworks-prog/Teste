from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.data.upload.mapper.UploadMapper import UploadMapper
from app.data.upload.model.UploadModel import UploadModel
from app.domain.upload.model.Upload import Upload
from app.domain.upload.repository.UploadRepository import UploadRepository


class SQLUploadRepository(UploadRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def save(self, upload: Upload) -> Upload:
        model = UploadModel(
            id=upload.id,
            user_id=upload.user_id,
            filename=upload.filename,
            content_type=upload.content_type,
            created_at=upload.created_at,
        )
        self._session.add(model)
        await self._session.commit()
        return upload

    async def get(self, upload_id: UUID) -> Upload | None:
        model = await self._session.get(UploadModel, upload_id)
        return UploadMapper.to_entity(model) if model is not None else None
