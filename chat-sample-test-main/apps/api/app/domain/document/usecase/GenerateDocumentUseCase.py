import asyncio
from typing import Any
from uuid import uuid4

from app.domain.document.DocumentStorage import DocumentStorage
from app.domain.document.PdfRenderer import PdfRenderer
from app.domain.document.model.GeneratedDocument import GeneratedDocument


class GenerateDocumentUseCase:
    def __init__(self, renderer: PdfRenderer, storage: DocumentStorage) -> None:
        self._renderer = renderer
        self._storage = storage

    async def execute(self, template_id: str, data: dict[str, Any]) -> GeneratedDocument:
        # render is CPU-bound (WeasyPrint) -> move it off the event loop.
        pdf = await asyncio.to_thread(self._renderer.render, template_id, data)
        document_id = uuid4()
        await self._storage.save(document_id, pdf)
        return GeneratedDocument(id=document_id, url=self._storage.url(document_id))
