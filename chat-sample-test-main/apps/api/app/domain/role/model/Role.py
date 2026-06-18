from dataclasses import dataclass
from uuid import UUID

from app.domain.permission.model.Permission import Permission

@dataclass
class Role:
    id: UUID
    name: str
    permissions: set[Permission]