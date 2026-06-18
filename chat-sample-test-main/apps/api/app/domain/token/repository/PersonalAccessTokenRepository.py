from abc import ABC, abstractmethod
from uuid import UUID

from app.domain.token.model.PersonalAccessToken import PersonalAccessToken


class PersonalAccessTokenRepository(ABC):
    @abstractmethod
    async def get_by_user_id(self, user_id: UUID) -> PersonalAccessToken | None:
        ...

    @abstractmethod
    async def create(self, token: PersonalAccessToken, token_hash: str) -> None:
        """Persists the token. The hash comes separately (it is not part of the entity)."""
        ...

    @abstractmethod
    async def delete_by_user_id(self, user_id: UUID) -> None:
        ...

    @abstractmethod
    async def find_user_id_by_hash(self, token_hash: str) -> UUID | None:
        """Resolves the token's owner from the hash (used in authentication)."""
        ...
