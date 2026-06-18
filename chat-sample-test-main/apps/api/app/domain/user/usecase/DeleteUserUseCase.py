from uuid import UUID

from app.domain.user.repository.UserRepository import UserRepository
from app.domain.session.SessionStore import SessionStore
from app.domain.permission.PermissionCache import PermissionCache
from app.domain.user.exceptions import UserNotFoundError


class DeleteUserUseCase:
    def __init__(
        self,
        users: UserRepository,
        sessions: SessionStore,
        cache: PermissionCache,
    ) -> None:
        self._users = users
        self._sessions = sessions
        self._cache = cache

    async def execute(self, user_id: UUID) -> None:
        user = await self._users.get_by_id(user_id)
        if user is None:
            raise UserNotFoundError()

        await self._users.delete(user_id)
        # Without this, the sessions/cache would be left orphaned pointing to a dead user.
        await self._sessions.delete_all(user_id)
        await self._cache.invalidate(user_id)
