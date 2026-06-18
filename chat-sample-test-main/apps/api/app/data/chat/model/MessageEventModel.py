from datetime import datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import Column, DateTime, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import SQLModel, Field


class MessageEventModel(SQLModel, table=True):
    __tablename__ = "message_events"
    # (message_id, seq) unique guarantees the trajectory order and also creates the index.
    __table_args__ = (UniqueConstraint("message_id", "seq", name="uq_event_message_seq"),)

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    chat_id: UUID = Field(foreign_key="chats.id", index=True)
    message_id: UUID = Field(foreign_key="messages.id", index=True)
    seq: int
    type: str
    owner: str
    payload: dict[str, Any] = Field(sa_column=Column(JSONB, nullable=False))
    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False)
    )
