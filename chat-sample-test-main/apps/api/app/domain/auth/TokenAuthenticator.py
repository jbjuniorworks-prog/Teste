from uuid import UUID

from app.domain.auth.Authenticator import Authenticator, Credentials
from app.domain.token.TokenHasher import TokenHasher
from app.domain.token.repository.PersonalAccessTokenRepository import (
    PersonalAccessTokenRepository,
)


class TokenAuthenticator(Authenticator):
    def __init__(
        self,
        tokens: PersonalAccessTokenRepository,
        hasher: TokenHasher,
    ) -> None:
        self._tokens = tokens
        self._hasher = hasher

    async def authenticate(self, credentials: Credentials) -> UUID | None:
        if credentials.bearer_token is None:
            return None
        # deterministic sha256 → indexed lookup by hash (no constant-time
        # comparison: the secret has high enough entropy).
        token_hash = self._hasher.hash(credentials.bearer_token)
        return await self._tokens.find_user_id_by_hash(token_hash)
