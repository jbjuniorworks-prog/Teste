from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status

from app.domain.permission.model.Permission import Permission
from app.presentation.user.schemas import (
    CreateUserRequest,
    UpdateUserRequest,
    UserResponse,
)
from app.core.dependencies import require_permission
from app.presentation.user.dependencies import (
    GetAllUsersUseCaseDep,
    GetUserUseCaseDep,
    CreateUserUseCaseDep,
    UpdateUserUseCaseDep,
    DeleteUserUseCaseDep,
)

router = APIRouter(prefix="/users", tags=["users"])

# The domain exceptions (UserNotFound, EmailAlreadyExists, RoleNotFound,
# PermissionDenied) bubble up to the global handlers in presentation/errors.py.


@router.get("", response_model=list[UserResponse])
async def list_users(
    _: Annotated[UUID, Depends(require_permission(Permission.USERS_GET_ALL))],
    usecase: GetAllUsersUseCaseDep,
) -> list:
    return await usecase.execute()


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    _: Annotated[UUID, Depends(require_permission(Permission.USERS_GET))],
    usecase: GetUserUseCaseDep,
):
    return await usecase.execute(user_id)


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    body: CreateUserRequest,
    _: Annotated[UUID, Depends(require_permission(Permission.USERS_CREATE))],
    usecase: CreateUserUseCaseDep,
):
    return await usecase.execute(body.name, body.email, body.password, body.role_id)


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    body: UpdateUserRequest,
    _: Annotated[UUID, Depends(require_permission(Permission.USERS_UPDATE))],
    usecase: UpdateUserUseCaseDep,
):
    return await usecase.execute(
        user_id, body.name, body.email, body.password, body.role_id
    )


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: UUID,
    _: Annotated[UUID, Depends(require_permission(Permission.USERS_DELETE))],
    usecase: DeleteUserUseCaseDep,
) -> None:
    await usecase.execute(user_id)
