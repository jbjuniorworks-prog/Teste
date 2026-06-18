from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class SendMessageRequest(BaseModel):
    chat_id: UUID | None = None     # None = starts a new chat
    message: str
    attachment_ids: list[UUID] = []  # attached uploads (PoC: 0 or 1)


class SendMessageResponse(BaseModel):
    chat_id: UUID
    run_id: UUID                    # = id of the assistant's message
    stream_url: str                 # where to watch the run live (SSE)


class ChatSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str | None
    created_at: datetime
    updated_at: datetime


class EventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    seq: int
    type: str
    owner: str
    payload: dict[str, Any]
    created_at: datetime


class MessageOut(BaseModel):
    id: UUID
    role: str
    content: str | None
    status: str | None
    error: str | None
    meta: dict[str, Any] | None = None
    created_at: datetime
    completed_at: datetime | None
    events: list[EventOut] = []


class ChatDetailResponse(BaseModel):
    id: UUID
    title: str | None
    created_at: datetime
    updated_at: datetime
    messages: list[MessageOut]
