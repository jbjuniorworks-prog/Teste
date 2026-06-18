from datetime import datetime

from sqlalchemy import Column, DateTime
from sqlmodel import SQLModel, Field


class IdempotencyKeyModel(SQLModel, table=True):
    __tablename__ = "idempotency_keys"

    key: str = Field(primary_key=True)            # value of the Idempotency-Key header
    fingerprint: str                              # sha256(method+path+body)
    status: str                                   # 'in_progress' | 'completed'
    response_status: int | None = None
    response_body: str | None = None
    content_type: str | None = None
    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False)
    )
    completed_at: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True), nullable=True)
    )
