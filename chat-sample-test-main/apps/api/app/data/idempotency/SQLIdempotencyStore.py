from datetime import datetime, timezone

from sqlalchemy import delete, or_, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.data.idempotency.model.IdempotencyKeyModel import IdempotencyKeyModel
from app.domain.idempotency.IdempotencyStore import IdempotencyStore
from app.domain.idempotency.model.IdempotencyRecord import (
    IdempotencyRecord,
    IdempotencyStatus,
)


class SQLIdempotencyStore(IdempotencyStore):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get(self, key: str) -> IdempotencyRecord | None:
        model = await self._session.get(IdempotencyKeyModel, key)
        if model is None:
            return None
        return IdempotencyRecord(
            key=model.key,
            fingerprint=model.fingerprint,
            status=model.status,
            response_status=model.response_status,
            response_body=model.response_body,
            content_type=model.content_type,
            created_at=model.created_at,
        )

    async def begin(self, key: str, fingerprint: str) -> bool:
        # INSERT ON CONFLICT DO NOTHING: whoever inserts first wins the race.
        statement = (
            insert(IdempotencyKeyModel)
            .values(
                key=key,
                fingerprint=fingerprint,
                status=IdempotencyStatus.IN_PROGRESS,
                created_at=datetime.now(timezone.utc),
            )
            .on_conflict_do_nothing(index_elements=["key"])
        )
        result = await self._session.execute(statement)
        await self._session.commit()
        return (result.rowcount or 0) > 0

    async def complete(
        self, key: str, response_status: int, response_body: str, content_type: str
    ) -> None:
        await self._session.execute(
            update(IdempotencyKeyModel)
            .where(IdempotencyKeyModel.key == key)
            .values(
                status=IdempotencyStatus.COMPLETED,
                response_status=response_status,
                response_body=response_body,
                content_type=content_type,
                completed_at=datetime.now(timezone.utc),
            )
        )
        await self._session.commit()

    async def discard(self, key: str) -> None:
        await self._session.execute(
            delete(IdempotencyKeyModel).where(IdempotencyKeyModel.key == key)
        )
        await self._session.commit()

    async def purge_stale(
        self, in_progress_before: datetime, completed_before: datetime
    ) -> int:
        result = await self._session.execute(
            delete(IdempotencyKeyModel).where(
                or_(
                    (IdempotencyKeyModel.status == IdempotencyStatus.IN_PROGRESS)
                    & (IdempotencyKeyModel.created_at < in_progress_before),
                    (IdempotencyKeyModel.status == IdempotencyStatus.COMPLETED)
                    & (IdempotencyKeyModel.completed_at < completed_before),
                )
            )
        )
        await self._session.commit()
        return result.rowcount or 0
