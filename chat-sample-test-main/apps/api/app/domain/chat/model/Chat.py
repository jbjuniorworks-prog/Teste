from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass
class Chat:
    """A user's conversation thread."""

    id: UUID
    user_id: UUID
    title: str | None
    created_at: datetime
    updated_at: datetime
