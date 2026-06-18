from uuid import UUID

from app.domain.permission.model.Permission import Permission
from app.domain.permission.PermissionCache import PermissionCache
from app.domain.user.repository.UserRepository import UserRepository


class ResolvePermissionsUseCase:
    def __init__(
        self,
        cache: PermissionCache,
        users: UserRepository,
    ) -> None:
        self._cache = cache
        self._users = users

    async def execute(self, user_id: UUID) -> set[Permission]:
        cached = await self._cache.get(user_id)
        if cached is not None:
            return cached

        # Miss: the source of truth is Postgres.
        user = await self._users.get_by_id(user_id)
        permissions = user.role.permissions if user is not None else set()

        await self._cache.set(user_id, permissions)
        return permissions
