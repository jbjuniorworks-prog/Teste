from uuid import UUID

from app.domain.token.model.PersonalAccessToken import PersonalAccessToken
from app.domain.token.repository.PersonalAccessTokenRepository import (
    PersonalAccessTokenRepository,
)


class GetMyTokenUseCase:
    def __init__(self, tokens: PersonalAccessTokenRepository) -> None:
        self._tokens = tokens

    async def execute(self, user_id: UUID) -> PersonalAccessToken | None:
        return await self._tokens.get_by_user_id(user_id)
