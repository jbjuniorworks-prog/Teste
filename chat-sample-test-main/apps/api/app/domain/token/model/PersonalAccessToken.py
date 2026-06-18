from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass
class PersonalAccessToken:
    # Token metadata — never carries the plaintext value nor the hash.
    id: UUID
    user_id: UUID
    prefix: str
    created_at: datetime
