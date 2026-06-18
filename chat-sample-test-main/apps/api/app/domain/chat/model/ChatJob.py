from dataclasses import dataclass, field
from uuid import UUID


@dataclass
class ChatJob:
    """Chat run job enqueued by the API and consumed by the worker."""

    run_id: UUID            # = id of the assistant message
    chat_id: UUID
    user_id: UUID
    user_message_id: UUID
    message: str
    attachment_ids: list[UUID] = field(default_factory=list)
