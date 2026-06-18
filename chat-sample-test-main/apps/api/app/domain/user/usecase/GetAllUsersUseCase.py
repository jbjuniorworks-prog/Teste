from app.domain.user.model.User import User
from app.domain.user.repository.UserRepository import UserRepository


class GetAllUsersUseCase:
    def __init__(self, users: UserRepository) -> None:
        self._users = users

    async def execute(self) -> list[User]:
        return await self._users.get_all()
