from uuid import UUID

from app.domain.user.model.User import User
from app.domain.user.repository.UserRepository import UserRepository
from app.domain.role.repository.RoleRepository import RoleRepository
from app.domain.auth.PasswordHasher import PasswordHasher
from app.domain.permission.PermissionCache import PermissionCache
from app.domain.user.exceptions import UserNotFoundError, EmailAlreadyExistsError
from app.domain.role.exceptions import RoleNotFoundError


class UpdateUserUseCase:
    def __init__(
        self,
        users: UserRepository,
        roles: RoleRepository,
        hasher: PasswordHasher,
        cache: PermissionCache,
    ) -> None:
        self._users = users
        self._roles = roles
        self._hasher = hasher
        self._cache = cache

    async def execute(
        self,
        user_id: UUID,
        name: str | None = None,
        email: str | None = None,
        password: str | None = None,
        role_id: UUID | None = None,
    ) -> User:
        user = await self._users.get_by_id(user_id)
        if user is None:
            raise UserNotFoundError()

        if name is not None:
            user.name = name

        if email is not None and email != user.email:
            if await self._users.get_by_email(email) is not None:
                raise EmailAlreadyExistsError()
            user.email = email

        if password is not None:
            user.hashed_password = await self._hasher.hash(password)

        role_changed = role_id is not None and role_id != user.role.id
        if role_changed:
            role = await self._roles.get_by_id(role_id)
            if role is None:
                raise RoleNotFoundError()
            user.role = role

        updated = await self._users.update(user)

        # Changing role changes the effective permissions: invalidate the cache so that
        # ALL of the user's sessions reload on the next request.
        if role_changed:
            await self._cache.invalidate(user_id)

        return updated
