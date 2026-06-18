import secrets
import time
from uuid import UUID

from redis.asyncio import Redis

from app.core.config import settings
from app.domain.session.SessionStore import SessionStore


class RedisSessionStore(SessionStore):
    def __init__(self, redis: Redis) -> None:
        self._redis = redis
        self._idle_ttl = settings.SESSION_IDLE_TTL
        self._absolute_ttl = settings.SESSION_ABSOLUTE_TTL

    async def create(self, user_id: UUID) -> str:
        session_id = secrets.token_urlsafe(32)
        session_key = self._session_key(session_id)
        index_key = self._user_index_key(user_id)
        # Absolute maximum deadline: not even continuous activity extends beyond this.
        expires_at = time.time() + self._absolute_ttl

        async with self._redis.pipeline(transaction=True) as pipe:
            # Hash stores owner + absolute deadline. The key's TTL is the idle one (slides).
            pipe.hset(
                session_key,
                mapping={"user_id": str(user_id), "expires_at": expires_at},
            )
            pipe.expire(session_key, self._idle_ttl)
            pipe.sadd(index_key, session_id)
            # The index lives until the absolute cap, to cover the longest-lived session.
            pipe.expire(index_key, self._absolute_ttl)
            await pipe.execute()

        return session_id

    async def get_user_id(self, session_id: str) -> UUID | None:
        session_key = self._session_key(session_id)
        data = await self._redis.hgetall(session_key)
        if not data:
            # Missing key: either it never existed, or the idle TTL already deleted it.
            return None

        if time.time() >= float(data["expires_at"]):
            # Absolute cap reached even with continuous use: end the session.
            await self.delete(session_id)
            return None

        # Valid access: renew the idle TTL (sliding expiration).
        await self._redis.expire(session_key, self._idle_ttl)
        return UUID(data["user_id"])

    async def delete(self, session_id: str) -> None:
        # We need the user_id to also remove it from the index. We read it before deleting.
        user_id = await self._redis.hget(self._session_key(session_id), "user_id")

        async with self._redis.pipeline(transaction=True) as pipe:
            pipe.delete(self._session_key(session_id))
            if user_id is not None:
                pipe.srem(self._user_index_key(UUID(user_id)), session_id)
            await pipe.execute()

    async def delete_all(self, user_id: UUID) -> None:
        index_key = self._user_index_key(user_id)
        session_ids = await self._redis.smembers(index_key)

        keys = [self._session_key(session_id) for session_id in session_ids]
        # Delete all sessions and the index itself in one go.
        await self._redis.delete(*keys, index_key)

    def _session_key(self, session_id: str) -> str:
        return f"session:{session_id}"

    def _user_index_key(self, user_id: UUID) -> str:
        return f"sessions:user:{user_id}"
