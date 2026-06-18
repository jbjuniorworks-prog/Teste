from uuid import UUID, uuid4

from app.domain.user.model.User import User
from app.domain.user.repository.UserRepository import UserRepository
from app.domain.role.repository.RoleRepository import RoleRepository
from app.domain.auth.PasswordHasher import PasswordHasher
from app.domain.user.exceptions import EmailAlreadyExistsError
from app.domain.role.exceptions import RoleNotFoundError


class CreateUserUseCase:
    def __init__(
        self,
        users: UserRepository,
        roles: RoleRepository,
        hasher: PasswordHasher,
    ) -> None:
        self._users = users
        self._roles = roles
        self._hasher = hasher

    async def execute(
        self,
        name: str,
        email: str,
        password: str,
        role_id: UUID,
    ) -> User:
        if await self._users.get_by_email(email) is not None:
            raise EmailAlreadyExistsError()

        role = await self._roles.get_by_id(role_id)
        if role is None:
            raise RoleNotFoundError()

        # UUID generated in the application (project convention), not in the database.
        user = User(
            id=uuid4(),
            name=name,
            email=email,
            hashed_password=await self._hasher.hash(password),
            role=role,
        )
        return await self._users.create(user)
