from uuid import UUID

from redis.asyncio import Redis

from app.core.config import settings
from app.domain.token.EphemeralTokenStore import EphemeralTokenStore


class RedisEphemeralTokenStore(EphemeralTokenStore):
    def __init__(self, redis: Redis) -> None:
        self._redis = redis
        self._ttl = settings.AGENT_TOKEN_TTL

    async def save(self, token_hash: str, user_id: UUID) -> None:
        await self._redis.set(self._key(token_hash), str(user_id), ex=self._ttl)

    async def find_user_id_by_hash(self, token_hash: str) -> UUID | None:
        user_id = await self._redis.get(self._key(token_hash))
        if user_id is None:
            return None
        return UUID(user_id)

    def _key(self, token_hash: str) -> str:
        return f"agent_token:{token_hash}"
