from abc import ABC, abstractmethod
from uuid import UUID


class SessionStore(ABC):
    @abstractmethod
    async def create(self, user_id: UUID) -> str:
        """Creates a session for the user and returns the opaque session ID."""
        ...

    @abstractmethod
    async def get_user_id(self, session_id: str) -> UUID | None:
        """Resolves the user_id that owns the session, or None if the session does not exist/has expired."""
        ...

    @abstractmethod
    async def delete(self, session_id: str) -> None:
        """Ends a single session."""
        ...

    @abstractmethod
    async def delete_all(self, user_id: UUID) -> None:
        """Ends all of the user's sessions (log out everywhere)."""
        ...
