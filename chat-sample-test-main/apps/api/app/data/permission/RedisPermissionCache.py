import json
from uuid import UUID

from redis.asyncio import Redis

from app.core.config import settings
from app.domain.permission.PermissionCache import PermissionCache
from app.domain.permission.model.Permission import Permission


class RedisPermissionCache(PermissionCache):
    def __init__(self, redis: Redis) -> None:
        self._redis = redis
        self._ttl = settings.PERMS_CACHE_TTL

    async def get(self, user_id: UUID) -> set[Permission] | None:
        raw = await self._redis.get(self._key(user_id))
        if raw is None:
            return None
        # JSON string exists (even if "[]") => it's a HIT, including an empty set.
        return {Permission(value) for value in json.loads(raw)}

    async def set(self, user_id: UUID, permissions: set[Permission]) -> None:
        raw = json.dumps([str(permission) for permission in permissions])
        await self._redis.set(self._key(user_id), raw, ex=self._ttl)

    async def invalidate(self, user_id: UUID) -> None:
        await self._redis.delete(self._key(user_id))

    def _key(self, user_id: UUID) -> str:
        return f"perms:user:{user_id}"
