from abc import ABC, abstractmethod
from uuid import UUID


class EphemeralTokenStore(ABC):
    """Short-lived token (Redis + TTL) minted from the session for the in-app chatbot.

    Stores the token HASH -> user_id (same pattern as the PAT; never the raw value).
    """

    @abstractmethod
    async def save(self, token_hash: str, user_id: UUID) -> None:
        ...

    @abstractmethod
    async def find_user_id_by_hash(self, token_hash: str) -> UUID | None:
        ...
