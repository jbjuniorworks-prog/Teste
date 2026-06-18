import json
from collections.abc import AsyncIterator
from typing import Any
from uuid import UUID

from redis.asyncio import Redis

from app.core.config import settings
from app.domain.chat.ChatEventStream import ChatEventStream
from app.domain.chat.model.constants import SUPERVISOR, EventType

_BLOCK_MS = 15000


class RedisChatEventStream(ChatEventStream):
    """Redis Stream per run + active-run pointer per chat.

    `XADD` publishes; the subscriber uses `XREAD` starting from "0" (catch-up from
    the beginning) or from an id (resume via Last-Event-ID), blocking for new events
    until the `done` sentinel.
    """

    def __init__(self, redis: Redis) -> None:
        self._redis = redis
        self._ttl = settings.CHAT_STREAM_TTL

    def _key(self, run_id: UUID) -> str:
        return f"chat:stream:{run_id}"

    def _active_key(self, chat_id: UUID) -> str:
        return f"chat:active_run:{chat_id}"

    async def append(self, run_id: UUID, event: dict[str, Any]) -> str:
        return await self._redis.xadd(self._key(run_id), {"data": json.dumps(event)})

    async def subscribe(
        self, run_id: UUID, *, after: str | None = None
    ) -> AsyncIterator[tuple[str, dict[str, Any]]]:
        key = self._key(run_id)
        # last="0" => catch-up from the beginning; after => resume (Last-Event-ID).
        # XREAD BLOCK waits even if the stream does not exist yet (just-triggered run).
        last = after or "0"
        while True:
            resp = await self._redis.xread({key: last}, count=200, block=_BLOCK_MS)
            if not resp:
                # block timeout: stream never appeared or already expired -> finish.
                if not await self._redis.exists(key):
                    return
                continue
            _, entries = resp[0]
            for entry_id, fields in entries:
                event = json.loads(fields["data"])
                yield entry_id, event
                last = entry_id
                if event.get("type") == EventType.DONE:
                    return

    async def mark_done(self, run_id: UUID) -> None:
        key = self._key(run_id)
        await self._redis.xadd(
            key,
            {"data": json.dumps({"type": EventType.DONE, "owner": SUPERVISOR, "payload": {}})},
        )
        await self._redis.expire(key, self._ttl)

    async def exists(self, run_id: UUID) -> bool:
        return bool(await self._redis.exists(self._key(run_id)))

    async def set_active(self, chat_id: UUID, run_id: UUID) -> None:
        await self._redis.set(self._active_key(chat_id), str(run_id), ex=self._ttl)

    async def get_active(self, chat_id: UUID) -> UUID | None:
        value = await self._redis.get(self._active_key(chat_id))
        return UUID(value) if value else None

    async def clear_active(self, chat_id: UUID) -> None:
        await self._redis.delete(self._active_key(chat_id))
