from abc import ABC, abstractmethod
from uuid import UUID

from app.domain.role.model.Role import Role

class RoleRepository(ABC):
    @abstractmethod
    async def get_by_id(self, id: UUID) -> Role | None: ...

    @abstractmethod
    async def get_by_name(self, name: str) -> Role | None: ...

    @abstractmethod
    async def get_all(self) -> list[Role]: ...