from typing import Annotated

from fastapi import Depends

from app.core.dependencies import SessionDep, UserRepositoryDep
from app.data.upload.LocalUploadStorage import LocalUploadStorage
from app.data.upload.OpenAIPdfUserExtractor import OpenAIPdfUserExtractor
from app.data.upload.repository.SQLUploadRepository import SQLUploadRepository
from app.domain.upload.PdfUserExtractor import PdfUserExtractor
from app.domain.upload.UploadStorage import UploadStorage
from app.domain.upload.repository.UploadRepository import UploadRepository
from app.domain.upload.usecase.CompareUserListsUseCase import CompareUserListsUseCase
from app.domain.upload.usecase.CreateUploadUseCase import CreateUploadUseCase


def get_upload_storage() -> UploadStorage:
    return LocalUploadStorage()


UploadStorageDep = Annotated[UploadStorage, Depends(get_upload_storage)]


def get_upload_repository(session: SessionDep) -> UploadRepository:
    return SQLUploadRepository(session)


UploadRepositoryDep = Annotated[UploadRepository, Depends(get_upload_repository)]


def get_pdf_user_extractor() -> PdfUserExtractor:
    return OpenAIPdfUserExtractor()


PdfUserExtractorDep = Annotated[PdfUserExtractor, Depends(get_pdf_user_extractor)]


def get_create_upload_usecase(
    uploads: UploadRepositoryDep, storage: UploadStorageDep
) -> CreateUploadUseCase:
    return CreateUploadUseCase(uploads, storage)


CreateUploadUseCaseDep = Annotated[
    CreateUploadUseCase, Depends(get_create_upload_usecase)
]


def get_compare_user_lists_usecase(
    uploads: UploadRepositoryDep,
    storage: UploadStorageDep,
    extractor: PdfUserExtractorDep,
    users: UserRepositoryDep,
) -> CompareUserListsUseCase:
    return CompareUserListsUseCase(uploads, storage, extractor, users)


CompareUserListsUseCaseDep = Annotated[
    CompareUserListsUseCase, Depends(get_compare_user_lists_usecase)
]
