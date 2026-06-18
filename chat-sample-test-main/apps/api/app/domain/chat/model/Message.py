from dataclasses import dataclass
from datetime import datetime
from typing import Any
from uuid import UUID


@dataclass
class Message:
    """A complete chat message.

    The `assistant` row is also the "run": its `id` is the runId (the stream key
    in Redis). `content` stays None while `status == running`; it's filled with
    the final response when the run finishes.
    """

    id: UUID
    chat_id: UUID
    role: str                       # MessageRole
    content: str | None
    status: str | None              # MessageStatus (None for user messages)
    error: str | None
    meta: dict[str, Any] | None     # e.g. {"model": "...", "usage": {...}}
    created_at: datetime
    completed_at: datetime | None
