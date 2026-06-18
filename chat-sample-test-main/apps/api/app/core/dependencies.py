"""Cross-feature composition root: infra, adapters and core authz.

This is where the domain ports are wired to the concrete `data` adapters (via
FastAPI `Depends`). The wiring of each feature's use cases lives in
`presentation/<feature>/dependencies.py` and imports the adapters from here.
"""

from typing import Annotated
from uuid import UUID

from fastapi import Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.data.infra.database import get_session
from app.data.infra.redis import get_redis
from app.data.user.repository.SQLUserRepository import SQLUserRepository
from app.data.role.repository.SQLRoleRepository import SQLRoleRepository
from app.data.session.RedisSessionStore import RedisSessionStore
from app.data.permission.RedisPermissionCache import RedisPermissionCache
from app.data.auth.BcryptPasswordHasher import BcryptPasswordHasher
from app.data.token.repository.SQLPersonalAccessTokenRepository import (
    SQLPersonalAccessTokenRepository,
)
from app.data.token.Sha256TokenHasher import Sha256TokenHasher
from app.data.token.RedisEphemeralTokenStore import RedisEphemeralTokenStore
from app.domain.user.repository.UserRepository import UserRepository
from app.domain.role.repository.RoleRepository import RoleRepository
from app.domain.session.SessionStore import SessionStore
from app.domain.permission.PermissionCache import PermissionCache
from app.domain.permission.model.Permission import Permission
from app.domain.token.repository.PersonalAccessTokenRepository import (
    PersonalAccessTokenRepository,
)
from app.domain.token.TokenHasher import TokenHasher
from app.domain.token.EphemeralTokenStore import EphemeralTokenStore
from app.domain.auth.PasswordHasher import PasswordHasher
from app.domain.auth.exceptions import NotAuthenticatedError, PermissionDeniedError
from app.domain.auth.usecase.ResolvePermissionsUseCase import ResolvePermissionsUseCase
from app.domain.auth.Authenticator import Authenticator, Credentials
from app.domain.auth.SessionAuthenticator import SessionAuthenticator
from app.domain.auth.TokenAuthenticator import TokenAuthenticator
from app.domain.auth.EphemeralTokenAuthenticator import EphemeralTokenAuthenticator


# --- Infra (session/redis) ---

SessionDep = Annotated[AsyncSession, Depends(get_session)]
RedisDep = Annotated[Redis, Depends(get_redis)]


# --- Adapters (concrete impls) ---

def get_user_repository(session: SessionDep) -> UserRepository:
    return SQLUserRepository(session)


UserRepositoryDep = Annotated[UserRepository, Depends(get_user_repository)]


def get_role_repository(session: SessionDep) -> RoleRepository:
    return SQLRoleRepository(session)


RoleRepositoryDep = Annotated[RoleRepository, Depends(get_role_repository)]


def get_session_store(redis: RedisDep) -> SessionStore:
    return RedisSessionStore(redis)


SessionStoreDep = Annotated[SessionStore, Depends(get_session_store)]


def get_permission_cache(redis: RedisDep) -> PermissionCache:
    return RedisPermissionCache(redis)


PermissionCacheDep = Annotated[PermissionCache, Depends(get_permission_cache)]


def get_password_hasher() -> PasswordHasher:
    return BcryptPasswordHasher()


PasswordHasherDep = Annotated[PasswordHasher, Depends(get_password_hasher)]


def get_pat_repository(session: SessionDep) -> PersonalAccessTokenRepository:
    return SQLPersonalAccessTokenRepository(session)


PatRepositoryDep = Annotated[
    PersonalAccessTokenRepository, Depends(get_pat_repository)
]


def get_token_hasher() -> TokenHasher:
    return Sha256TokenHasher()


TokenHasherDep = Annotated[TokenHasher, Depends(get_token_hasher)]


def get_ephemeral_token_store(redis: RedisDep) -> EphemeralTokenStore:
    return RedisEphemeralTokenStore(redis)


EphemeralTokenStoreDep = Annotated[
    EphemeralTokenStore, Depends(get_ephemeral_token_store)
]


# --- Authentication / Authorization (cross-feature) ---
# require_permission depends on ResolvePermissionsUseCase, so both live in the
# core: that way the shared part does not import from any feature.

def get_resolve_permissions_usecase(
    cache: PermissionCacheDep,
    users: UserRepositoryDep,
) -> ResolvePermissionsUseCase:
    return ResolvePermissionsUseCase(cache, users)


ResolvePermissionsUseCaseDep = Annotated[
    ResolvePermissionsUseCase, Depends(get_resolve_permissions_usecase)
]


def get_session_id(request: Request) -> str:
    # Used only by logout (which ends a specific session — only makes sense with
    # a cookie). General authentication uses the chain of authenticators below.
    session_id = request.cookies.get(settings.COOKIE_NAME)
    if not session_id:
        raise NotAuthenticatedError()
    return session_id


SessionIdDep = Annotated[str, Depends(get_session_id)]


# Authentication chain (Strategy). The list order = precedence.

def get_session_authenticator(sessions: SessionStoreDep) -> Authenticator:
    return SessionAuthenticator(sessions)


def get_token_authenticator(
    tokens: PatRepositoryDep,
    hasher: TokenHasherDep,
) -> Authenticator:
    return TokenAuthenticator(tokens, hasher)


def get_ephemeral_token_authenticator(
    store: EphemeralTokenStoreDep,
    hasher: TokenHasherDep,
) -> Authenticator:
    return EphemeralTokenAuthenticator(store, hasher)


def get_authenticators(
    ephemeral_authenticator: Annotated[
        Authenticator, Depends(get_ephemeral_token_authenticator)
    ],
    token_authenticator: Annotated[Authenticator, Depends(get_token_authenticator)],
    session_authenticator: Annotated[Authenticator, Depends(get_session_authenticator)],
) -> list[Authenticator]:
    # Order = precedence. Bearer before cookie. Among the bearers, the ephemeral
    # one (Redis, chatbot hot path) before the PAT (Postgres).
    return [ephemeral_authenticator, token_authenticator, session_authenticator]


AuthenticatorsDep = Annotated[list[Authenticator], Depends(get_authenticators)]

_bearer_scheme = HTTPBearer(auto_error=False)
BearerDep = Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer_scheme)]


async def get_current_user_id(
    request: Request,
    bearer: BearerDep,
    authenticators: AuthenticatorsDep,
) -> UUID:
    credentials = Credentials(
        bearer_token=bearer.credentials if bearer is not None else None,
        session_id=request.cookies.get(settings.COOKIE_NAME),
    )
    for authenticator in authenticators:
        user_id = await authenticator.authenticate(credentials)
        if user_id is not None:
            return user_id
    raise NotAuthenticatedError()


CurrentUserId = Annotated[UUID, Depends(get_current_user_id)]


def require_permission(permission: Permission):
    """Dependency factory: requires the current user to have the given permission."""

    async def checker(
        user_id: CurrentUserId,
        resolver: ResolvePermissionsUseCaseDep,
    ) -> UUID:
        permissions = await resolver.execute(user_id)
        if permission not in permissions:
            raise PermissionDeniedError()
        return user_id

    return checker
