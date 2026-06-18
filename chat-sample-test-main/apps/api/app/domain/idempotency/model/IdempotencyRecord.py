from dataclasses import dataclass
from datetime import datetime


class IdempotencyStatus:
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


@dataclass
class IdempotencyRecord:
    key: str
    fingerprint: str          # sha256(method + path + body) — detects improper reuse
    status: str               # IdempotencyStatus
    response_status: int | None
    response_body: str | None
    content_type: str | None
    created_at: datetime      # to detect orphaned in_progress (reaper / self-heal)
