from typing import Annotated

from fastapi import Depends

from app.domain.auth.usecase.LoginUseCase import LoginUseCase
from app.domain.auth.usecase.LogoutUseCase import LogoutUseCase
from app.domain.auth.usecase.LogoutAllUseCase import LogoutAllUseCase
from app.core.dependencies import (
    UserRepositoryDep,
    PasswordHasherDep,
    SessionStoreDep,
)


def get_login_usecase(
    users: UserRepositoryDep,
    hasher: PasswordHasherDep,
    sessions: SessionStoreDep,
) -> LoginUseCase:
    return LoginUseCase(users, hasher, sessions)


LoginUseCaseDep = Annotated[LoginUseCase, Depends(get_login_usecase)]


def get_logout_usecase(sessions: SessionStoreDep) -> LogoutUseCase:
    return LogoutUseCase(sessions)


LogoutUseCaseDep = Annotated[LogoutUseCase, Depends(get_logout_usecase)]


def get_logout_all_usecase(sessions: SessionStoreDep) -> LogoutAllUseCase:
    return LogoutAllUseCase(sessions)


LogoutAllUseCaseDep = Annotated[LogoutAllUseCase, Depends(get_logout_all_usecase)]
