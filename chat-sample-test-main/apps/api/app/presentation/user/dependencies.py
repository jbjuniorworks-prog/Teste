from typing import Annotated

from fastapi import Depends

from app.domain.user.usecase.GetAllUsersUseCase import GetAllUsersUseCase
from app.domain.user.usecase.GetUserUseCase import GetUserUseCase
from app.domain.user.usecase.CreateUserUseCase import CreateUserUseCase
from app.domain.user.usecase.UpdateUserUseCase import UpdateUserUseCase
from app.domain.user.usecase.DeleteUserUseCase import DeleteUserUseCase
from app.core.dependencies import (
    UserRepositoryDep,
    RoleRepositoryDep,
    PasswordHasherDep,
    PermissionCacheDep,
    SessionStoreDep,
)


def get_all_users_usecase(users: UserRepositoryDep) -> GetAllUsersUseCase:
    return GetAllUsersUseCase(users)


GetAllUsersUseCaseDep = Annotated[GetAllUsersUseCase, Depends(get_all_users_usecase)]


def get_user_usecase(users: UserRepositoryDep) -> GetUserUseCase:
    return GetUserUseCase(users)


GetUserUseCaseDep = Annotated[GetUserUseCase, Depends(get_user_usecase)]


def get_create_user_usecase(
    users: UserRepositoryDep,
    roles: RoleRepositoryDep,
    hasher: PasswordHasherDep,
) -> CreateUserUseCase:
    return CreateUserUseCase(users, roles, hasher)


CreateUserUseCaseDep = Annotated[CreateUserUseCase, Depends(get_create_user_usecase)]


def get_update_user_usecase(
    users: UserRepositoryDep,
    roles: RoleRepositoryDep,
    hasher: PasswordHasherDep,
    cache: PermissionCacheDep,
) -> UpdateUserUseCase:
    return UpdateUserUseCase(users, roles, hasher, cache)


UpdateUserUseCaseDep = Annotated[UpdateUserUseCase, Depends(get_update_user_usecase)]


def get_delete_user_usecase(
    users: UserRepositoryDep,
    sessions: SessionStoreDep,
    cache: PermissionCacheDep,
) -> DeleteUserUseCase:
    return DeleteUserUseCase(users, sessions, cache)


DeleteUserUseCaseDep = Annotated[DeleteUserUseCase, Depends(get_delete_user_usecase)]
