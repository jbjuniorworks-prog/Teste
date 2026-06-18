from abc import ABC, abstractmethod
from uuid import UUID

from app.domain.permission.model.Permission import Permission


class PermissionCache(ABC):
    @abstractmethod
    async def get(self, user_id: UUID) -> set[Permission] | None:
        """User's cached permissions, or None if there is no cache (miss)."""
        ...

    @abstractmethod
    async def set(self, user_id: UUID, permissions: set[Permission]) -> None:
        """Writes the user's permissions with a short TTL."""
        ...

    @abstractmethod
    async def invalidate(self, user_id: UUID) -> None:
        """Deletes the user's cache (e.g.: after a role change)."""
        ...
