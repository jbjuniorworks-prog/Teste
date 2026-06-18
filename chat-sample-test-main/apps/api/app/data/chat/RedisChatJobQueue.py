import json

from redis.asyncio import Redis

from app.core.config import settings
from app.domain.chat.ChatJobQueue import ChatJobQueue
from app.domain.chat.model.ChatJob import ChatJob


class RedisChatJobQueue(ChatJobQueue):
    def __init__(self, redis: Redis) -> None:
        self._redis = redis
        self._stream = settings.CHAT_JOBS_STREAM

    async def enqueue(self, job: ChatJob) -> str:
        payload = {
            "run_id": str(job.run_id),
            "chat_id": str(job.chat_id),
            "user_id": str(job.user_id),
            "user_message_id": str(job.user_message_id),
            "message": job.message,
            "attachment_ids": [str(aid) for aid in job.attachment_ids],
        }
        return await self._redis.xadd(self._stream, {"data": json.dumps(payload)})
