from uuid import UUID

from app.domain.auth.Authenticator import Authenticator, Credentials
from app.domain.token.EphemeralTokenStore import EphemeralTokenStore
from app.domain.token.TokenHasher import TokenHasher


class EphemeralTokenAuthenticator(Authenticator):
    def __init__(
        self,
        store: EphemeralTokenStore,
        hasher: TokenHasher,
    ) -> None:
        self._store = store
        self._hasher = hasher

    async def authenticate(self, credentials: Credentials) -> UUID | None:
        if credentials.bearer_token is None:
            return None
        token_hash = self._hasher.hash(credentials.bearer_token)
        return await self._store.find_user_id_by_hash(token_hash)
