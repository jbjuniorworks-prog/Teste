from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.user.model.User import User
from app.domain.user.repository.UserRepository import UserRepository
from app.data.user.model.UserModel import UserModel
from app.data.role.model.RoleModel import RoleModel
from app.data.user.mapper.UserMapper import UserMapper


class SQLUserRepository(UserRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, id: UUID) -> User | None:
        statement = (
            select(UserModel)
            .where(UserModel.id == id)
            .options(self._load_role())
        )
        result = await self._session.execute(statement)
        user_model = result.scalar_one_or_none()

        if user_model is None:
            return None

        return UserMapper.to_entity(user_model)

    async def get_by_email(self, email: str) -> User | None:
        statement = (
            select(UserModel)
            .where(UserModel.email == email)
            .options(self._load_role())
        )
        result = await self._session.execute(statement)
        user_model = result.scalar_one_or_none()

        if user_model is None:
            return None

        return UserMapper.to_entity(user_model)

    async def get_all(self) -> list[User]:
        statement = select(UserModel).options(self._load_role())
        result = await self._session.execute(statement)
        user_models = result.scalars().all()

        return [UserMapper.to_entity(model) for model in user_models]

    async def create(self, user: User) -> User:
        user_model = UserModel(
            id=user.id,
            name=user.name,
            email=user.email,
            hashed_password=user.hashed_password,
            role_id=user.role.id,
        )
        self._session.add(user_model)
        await self._session.commit()

        return user

    async def update(self, user: User) -> User:
        user_model = await self._session.get(UserModel, user.id)

        if user_model is None:
            raise ValueError(f"User {user.id} not found")

        user_model.name = user.name
        user_model.email = user.email
        user_model.hashed_password = user.hashed_password
        user_model.role_id = user.role.id

        await self._session.commit()

        return user

    async def delete(self, id: UUID) -> None:
        user_model = await self._session.get(UserModel, id)

        if user_model is None:
            return

        await self._session.delete(user_model)
        await self._session.commit()

    def _load_role(self):
        return selectinload(UserModel.role).selectinload(RoleModel.permissions)
