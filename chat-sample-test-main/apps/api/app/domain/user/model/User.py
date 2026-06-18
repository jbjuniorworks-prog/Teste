from dataclasses import dataclass
from uuid import UUID

from app.domain.role.model.Role import Role

@dataclass
class User:
    id: UUID
    name: str
    email: str
    hashed_password: str
    role: Role