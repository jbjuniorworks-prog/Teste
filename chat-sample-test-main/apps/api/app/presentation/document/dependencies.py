from typing import Annotated

from fastapi import Depends

from app.data.document.LocalDocumentStorage import LocalDocumentStorage
from app.data.document.WeasyPrintPdfRenderer import WeasyPrintPdfRenderer
from app.domain.document.DocumentStorage import DocumentStorage
from app.domain.document.PdfRenderer import PdfRenderer
from app.domain.document.usecase.GenerateDocumentUseCase import GenerateDocumentUseCase
from app.domain.document.usecase.GetDocumentUseCase import GetDocumentUseCase


def get_pdf_renderer() -> PdfRenderer:
    return WeasyPrintPdfRenderer()


PdfRendererDep = Annotated[PdfRenderer, Depends(get_pdf_renderer)]


def get_document_storage() -> DocumentStorage:
    return LocalDocumentStorage()


DocumentStorageDep = Annotated[DocumentStorage, Depends(get_document_storage)]


def get_generate_document_usecase(
    renderer: PdfRendererDep, storage: DocumentStorageDep
) -> GenerateDocumentUseCase:
    return GenerateDocumentUseCase(renderer, storage)


GenerateDocumentUseCaseDep = Annotated[
    GenerateDocumentUseCase, Depends(get_generate_document_usecase)
]


def get_get_document_usecase(storage: DocumentStorageDep) -> GetDocumentUseCase:
    return GetDocumentUseCase(storage)


GetDocumentUseCaseDep = Annotated[GetDocumentUseCase, Depends(get_get_document_usecase)]
