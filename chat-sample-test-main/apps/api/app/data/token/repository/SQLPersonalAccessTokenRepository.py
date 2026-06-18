from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.token.model.PersonalAccessToken import PersonalAccessToken
from app.domain.token.repository.PersonalAccessTokenRepository import (
    PersonalAccessTokenRepository,
)
from app.data.token.model.PersonalAccessTokenModel import PersonalAccessTokenModel
from app.data.token.mapper.PersonalAccessTokenMapper import PersonalAccessTokenMapper


class SQLPersonalAccessTokenRepository(PersonalAccessTokenRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_user_id(self, user_id: UUID) -> PersonalAccessToken | None:
        statement = select(PersonalAccessTokenModel).where(
            PersonalAccessTokenModel.user_id == user_id
        )
        result = await self._session.execute(statement)
        model = result.scalar_one_or_none()
        if model is None:
            return None
        return PersonalAccessTokenMapper.to_entity(model)

    async def create(self, token: PersonalAccessToken, token_hash: str) -> None:
        model = PersonalAccessTokenModel(
            id=token.id,
            user_id=token.user_id,
            token_hash=token_hash,
            prefix=token.prefix,
            created_at=token.created_at,
        )
        self._session.add(model)
        await self._session.commit()

    async def delete_by_user_id(self, user_id: UUID) -> None:
        statement = delete(PersonalAccessTokenModel).where(
            PersonalAccessTokenModel.user_id == user_id
        )
        await self._session.execute(statement)
        await self._session.commit()

    async def find_user_id_by_hash(self, token_hash: str) -> UUID | None:
        statement = select(PersonalAccessTokenModel.user_id).where(
            PersonalAccessTokenModel.token_hash == token_hash
        )
        result = await self._session.execute(statement)
        return result.scalar_one_or_none()
