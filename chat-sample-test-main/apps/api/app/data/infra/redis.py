from fastapi import Request
from redis.asyncio import Redis

from app.core.config import settings


def create_redis() -> Redis:
    # Single client, with an internal connection pool. decode_responses=True makes
    # Redis return str instead of bytes — convenient since we store IDs as text.
    return Redis.from_url(settings.REDIS_URL, decode_responses=True)


async def get_redis(request: Request) -> Redis:
    # The client is created in the lifespan and stored in app.state.
    return request.app.state.redis
