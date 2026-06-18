from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.elements import ColumnElement

from app.domain.role.model.Role import Role
from app.domain.role.repository.RoleRepository import RoleRepository
from app.data.role.model.RoleModel import RoleModel
from app.data.role.mapper.RoleMapper import RoleMapper


class SQLRoleRepository(RoleRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, id: UUID) -> Role | None:
        return await self._get_one(RoleModel.id == id)

    async def get_by_name(self, name: str) -> Role | None:
        return await self._get_one(RoleModel.name == name)

    async def get_all(self) -> list[Role]:
        statement = select(RoleModel).options(
            selectinload(RoleModel.permissions)
        )
        result = await self._session.execute(statement)
        role_models = result.scalars().all()
        return [RoleMapper.to_entity(model) for model in role_models]

    async def _get_one(self, condition: ColumnElement[bool]) -> Role | None:
        statement = (
            select(RoleModel)
            .where(condition)
            .options(selectinload(RoleModel.permissions))
        )
        result = await self._session.execute(statement)
        role_model = result.scalar_one_or_none()

        if role_model is None:
            return None

        return RoleMapper.to_entity(role_model)
