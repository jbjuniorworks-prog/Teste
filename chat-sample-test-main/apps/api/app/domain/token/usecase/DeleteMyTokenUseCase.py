from uuid import UUID

from app.domain.token.repository.PersonalAccessTokenRepository import (
    PersonalAccessTokenRepository,
)


class DeleteMyTokenUseCase:
    def __init__(self, tokens: PersonalAccessTokenRepository) -> None:
        self._tokens = tokens

    async def execute(self, user_id: UUID) -> None:
        await self._tokens.delete_by_user_id(user_id)
