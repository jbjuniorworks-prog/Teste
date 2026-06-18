import secrets
from datetime import datetime, timezone
from uuid import UUID, uuid4

from app.domain.token.model.PersonalAccessToken import PersonalAccessToken
from app.domain.token.repository.PersonalAccessTokenRepository import (
    PersonalAccessTokenRepository,
)
from app.domain.token.TokenHasher import TokenHasher

_PREFIX = "pat_"


class IssueTokenUseCase:
    """Issues a new token (creates OR regenerates). Since it is 1 per user, it deletes
    the previous one first. Returns the plaintext value ONCE — afterwards only the hash remains."""

    def __init__(
        self,
        tokens: PersonalAccessTokenRepository,
        hasher: TokenHasher,
    ) -> None:
        self._tokens = tokens
        self._hasher = hasher

    async def execute(self, user_id: UUID) -> tuple[str, PersonalAccessToken]:
        await self._tokens.delete_by_user_id(user_id)

        plaintext = _PREFIX + secrets.token_urlsafe(32)
        token = PersonalAccessToken(
            id=uuid4(),
            user_id=user_id,
            prefix=plaintext[: len(_PREFIX) + 6],  # e.g.: "pat_a1b2c3"
            created_at=datetime.now(timezone.utc),
        )
        await self._tokens.create(token, self._hasher.hash(plaintext))

        return plaintext, token
