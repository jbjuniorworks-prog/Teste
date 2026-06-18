from uuid import UUID

from app.domain.document.DocumentStorage import DocumentStorage
from app.domain.document.exceptions import DocumentNotFoundError


class GetDocumentUseCase:
    def __init__(self, storage: DocumentStorage) -> None:
        self._storage = storage

    async def execute(self, document_id: UUID) -> bytes:
        pdf = await self._storage.load(document_id)
        if pdf is None:
            raise DocumentNotFoundError()
        return pdf
