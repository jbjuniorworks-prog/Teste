from app.data.upload.model.UploadModel import UploadModel
from app.domain.upload.model.Upload import Upload


class UploadMapper:
    @staticmethod
    def to_entity(model: UploadModel) -> Upload:
        return Upload(
            id=model.id,
            user_id=model.user_id,
            filename=model.filename,
            content_type=model.content_type,
            created_at=model.created_at,
        )
