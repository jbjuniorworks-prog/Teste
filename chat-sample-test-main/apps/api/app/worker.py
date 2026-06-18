"""Chat worker: consumes the durable queue (Redis Stream + consumer group) and runs
the agent's runs outside the web process.

Guarantees:
- at-least-once: `XACK` only after `finalize` commits (never loses a run).
- dedup/claim: checks the terminal state in Postgres + a lease per `run_id` in Redis.
- recovery: `XAUTOCLAIM` claims pending jobs from a dead worker and reprocesses
  (safe thanks to dedup; in Phase B, resumes from the checkpoint).
"""

import asyncio
import json
import logging
import os
import signal
import socket
from datetime import datetime, timedelta, timezone
from uuid import UUID

import app.data.infra.models_registry  # noqa: F401  (registers the mappers)
from langgraph.checkpoint.redis.aio import AsyncRedisSaver

from app.agent.LangGraphAgentRunner import LangGraphAgentRunner
from app.agent.OpenAIChatTitler import OpenAIChatTitler
from app.core.config import settings
from app.data.chat.RedisChatEventStream import RedisChatEventStream
from app.data.chat.repository.SQLChatRepository import SQLChatRepository
from app.data.idempotency.SQLIdempotencyStore import SQLIdempotencyStore
from app.data.infra.database import create_engine, create_session_factory
from app.data.infra.redis import create_redis
from app.data.token.RedisEphemeralTokenStore import RedisEphemeralTokenStore
from app.data.token.Sha256TokenHasher import Sha256TokenHasher
from app.domain.chat.model.constants import MessageStatus
from app.domain.chat.usecase.RunChatUseCase import RunChatUseCase
from app.domain.token.usecase.IssueEphemeralTokenUseCase import (
    IssueEphemeralTokenUseCase,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("chat.worker")

STREAM = settings.CHAT_JOBS_STREAM
GROUP = settings.CHAT_JOBS_GROUP
CONSUMER = f"{socket.gethostname()}-{os.getpid()}"

_titler = OpenAIChatTitler()  # stateless, reusable across runs


def _lease_key(run_id: UUID) -> str:
    return f"run:lease:{run_id}"


async def _ensure_group(redis) -> None:
    try:
        await redis.xgroup_create(STREAM, GROUP, id="0", mkstream=True)
    except Exception as exc:  # BUSYGROUP = group already exists
        if "BUSYGROUP" not in str(exc):
            raise


async def _reconcile(session_factory) -> None:
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=settings.CHAT_RUN_STALE_SECONDS)
    async with session_factory() as session:
        n = await SQLChatRepository(session).fail_stale_runs(cutoff)
    if n:
        logger.warning("reconciler: %d orphan run(s) marked as failed", n)


async def _heartbeat(redis, key: str) -> None:
    """Renews the lease while the run is alive. Stopping the heartbeat (death/cancel)
    lets the lease expire quickly -> another worker can take over."""
    try:
        while True:
            await asyncio.sleep(settings.RUN_LEASE_HEARTBEAT_SECONDS)
            await redis.expire(key, settings.RUN_LEASE_TTL)
    except asyncio.CancelledError:
        pass


async def _reaper(session_factory, stop: "asyncio.Event") -> None:
    """Cleans the idempotency ledger: orphan in_progress + old completed."""
    interval = settings.IDEMPOTENCY_REAPER_INTERVAL_SECONDS
    while not stop.is_set():
        try:
            await asyncio.wait_for(stop.wait(), timeout=interval)
        except asyncio.TimeoutError:
            pass
        if stop.is_set():
            break
        now = datetime.now(timezone.utc)
        async with session_factory() as session:
            purged = await SQLIdempotencyStore(session).purge_stale(
                in_progress_before=now - timedelta(seconds=settings.IDEMPOTENCY_STALE_SECONDS),
                completed_before=now - timedelta(seconds=settings.IDEMPOTENCY_RETENTION_SECONDS),
            )
        if purged:
            logger.info("reaper: %d idempotency key(s) purged", purged)


async def _process(redis, session_factory, runner, entry_id: str, fields: dict) -> None:
    try:
        job = json.loads(fields["data"])
        run_id = UUID(job["run_id"])
    except Exception:
        logger.exception("invalid job %s — ack and discard", entry_id)
        await redis.xack(STREAM, GROUP, entry_id)
        return

    async with session_factory() as session:
        repo = SQLChatRepository(session)
        message = await repo.get_message(run_id)

        # Dedup: nonexistent or already-terminal run -> ack and ignore (run idempotency).
        if message is None or message.status in (
            MessageStatus.COMPLETE,
            MessageStatus.FAILED,
        ):
            await redis.xack(STREAM, GROUP, entry_id)
            return

        # Short lease via NX (applies to new delivery AND reclaim): only acquires if
        # the previous lease expired (dead owner). A live owner heartbeats -> NX fails -> skip.
        acquired = await redis.set(
            _lease_key(run_id), CONSUMER, nx=True, ex=settings.RUN_LEASE_TTL
        )
        if not acquired:
            return  # another live worker is on it; leave it pending (no ack)

        logger.info("run %s: starting", run_id)
        heartbeat = asyncio.create_task(_heartbeat(redis, _lease_key(run_id)))
        try:
            usecase = RunChatUseCase(
                chats=repo,
                stream=RedisChatEventStream(redis),
                runner=runner,
                token_issuer=IssueEphemeralTokenUseCase(
                    RedisEphemeralTokenStore(redis), Sha256TokenHasher()
                ),
                titler=_titler,
            )
            await usecase.execute(
                user_id=UUID(job["user_id"]),
                chat_id=UUID(job["chat_id"]),
                user_message_id=UUID(job["user_message_id"]),
                run_id=run_id,
                message=job["message"],
                attachment_ids=[UUID(aid) for aid in job.get("attachment_ids", [])],
            )
        finally:
            heartbeat.cancel()
            # XACK only after finalize (which the usecase always does, even on error).
            await redis.xack(STREAM, GROUP, entry_id)
            await redis.delete(_lease_key(run_id))
            logger.info("run %s: ack", run_id)


async def _reclaim(redis, session_factory, runner) -> None:
    """Claims pending jobs from a dead worker (idle > threshold) and reprocesses."""
    cursor = "0-0"
    while True:
        cursor, entries, _ = await redis.xautoclaim(
            STREAM, GROUP, CONSUMER, settings.XAUTOCLAIM_MIN_IDLE_MS, start_id=cursor, count=10
        )
        for entry_id, fields in entries:
            logger.info("reclaim: reprocessing %s", entry_id)
            await _process(redis, session_factory, runner, entry_id, fields)
        if cursor == "0-0":  # back to the start = swept everything
            break


async def main() -> None:
    engine = create_engine()
    session_factory = create_session_factory(engine)
    redis = create_redis()

    # Checkpointer: supervisor state by thread_id=run_id -> resume on reprocessing.
    saver = AsyncRedisSaver(redis_url=settings.REDIS_URL)
    await saver.asetup()
    runner = LangGraphAgentRunner(checkpointer=saver)

    await _ensure_group(redis)
    await _reconcile(session_factory)

    stop = asyncio.Event()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, stop.set)

    reaper = asyncio.create_task(_reaper(session_factory, stop))

    logger.info("worker %s listening on %s", CONSUMER, STREAM)
    try:
        while not stop.is_set():
            await _reclaim(redis, session_factory, runner)
            resp = await redis.xreadgroup(
                GROUP, CONSUMER, {STREAM: ">"}, count=1, block=5000
            )
            if not resp:
                continue
            for _stream, entries in resp:
                for entry_id, fields in entries:
                    await _process(redis, session_factory, runner, entry_id, fields)
    finally:
        reaper.cancel()
        await redis.aclose()
        await engine.dispose()
        logger.info("worker %s shut down", CONSUMER)


if __name__ == "__main__":
    asyncio.run(main())
