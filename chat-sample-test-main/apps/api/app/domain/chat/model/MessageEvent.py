from dataclasses import dataclass
from datetime import datetime
from typing import Any
from uuid import UUID


@dataclass
class MessageEvent:
    """An event from a run's trajectory (tool call, result, delegation, etc).

    Belongs to the assistant message (the run). `seq` is the order within the
    run. A subagent's internal events are NOT persisted — only the delegation
    (subagent_start) and the response (subagent_result).
    """

    id: UUID
    chat_id: UUID
    message_id: UUID         # the assistant message = the run
    seq: int
    type: str                # EventType
    owner: str               # always "supervisor" in the database
    payload: dict[str, Any]
    created_at: datetime
