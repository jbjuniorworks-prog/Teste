import secrets
from uuid import UUID

from app.domain.token.EphemeralTokenStore import EphemeralTokenStore
from app.domain.token.TokenHasher import TokenHasher

_PREFIX = "eat_"  # ephemeral access token


class IssueEphemeralTokenUseCase:
    """Mints an ephemeral token for the user (from the session, server-side).

    The in-app agent uses the returned value as the bearer in the MCP client. It
    expires on its own via the store's TTL — nothing the user sees or manages.
    """

    def __init__(
        self,
        store: EphemeralTokenStore,
        hasher: TokenHasher,
    ) -> None:
        self._store = store
        self._hasher = hasher

    async def execute(self, user_id: UUID) -> str:
        plaintext = _PREFIX + secrets.token_urlsafe(32)
        await self._store.save(self._hasher.hash(plaintext), user_id)
        return plaintext
