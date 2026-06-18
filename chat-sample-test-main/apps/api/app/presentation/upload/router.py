"""Uploads: the user uploads a PDF (e.g. a user list) and asks to compare it with
the system. Input to the 'upload -> extract -> match' pipeline (analogous to the catalog).

POST stores the file (session + Idempotency-Key by the middleware). The compare is a GET
(read), protected by RBAC (users:get_all) because it reads all users.
"""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status

from app.core.config import settings
from app.core.dependencies import CurrentUserId, require_permission
from app.domain.permission.model.Permission import Permission
from app.presentation.upload.dependencies import (
    CompareUserListsUseCaseDep,
    CreateUploadUseCaseDep,
)
from app.presentation.upload.schemas import (
    MatchedUserOut,
    RoleMismatchOut,
    UploadResponse,
    UserListComparisonResponse,
)

router = APIRouter(prefix="/uploads", tags=["uploads"])

# The domain exceptions (UploadNotFound 404, Extraction 422, PermissionDenied 403)
# bubble up to the global handlers in presentation/errors.py.


@router.post("", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def create_upload(
    file: UploadFile,
    user_id: CurrentUserId,
    usecase: CreateUploadUseCaseDep,
) -> UploadResponse:
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=415, detail="Only application/pdf is accepted")
    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File too large")
    upload = await usecase.execute(
        user_id=user_id,
        filename=file.filename or "upload.pdf",
        content_type=file.content_type,
        content=content,
    )
    return UploadResponse(id=upload.id, filename=upload.filename)


@router.get("/{upload_id}/compare-users", response_model=UserListComparisonResponse)
async def compare_users(
    upload_id: UUID,
    user_id: Annotated[UUID, Depends(require_permission(Permission.USERS_GET_ALL))],
    usecase: CompareUserListsUseCaseDep,
) -> UserListComparisonResponse:
    result = await usecase.execute(upload_id=upload_id, requester_id=user_id)
    return UserListComparisonResponse(
        matched=[MatchedUserOut(**vars(m)) for m in result.matched],
        role_mismatch=[RoleMismatchOut(**vars(m)) for m in result.role_mismatch],
        only_in_upload=[MatchedUserOut(**vars(m)) for m in result.only_in_upload],
        only_in_system=[MatchedUserOut(**vars(m)) for m in result.only_in_system],
    )
