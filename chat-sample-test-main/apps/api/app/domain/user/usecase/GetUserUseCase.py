from uuid import UUID

from app.domain.user.model.User import User
from app.domain.user.repository.UserRepository import UserRepository
from app.domain.user.exceptions import UserNotFoundError


class GetUserUseCase:
    def __init__(self, users: UserRepository) -> None:
        self._users = users

    async def execute(self, user_id: UUID) -> User:
        user = await self._users.get_by_id(user_id)
        if user is None:
            raise UserNotFoundError()
        return user
