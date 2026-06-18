from abc import ABC, abstractmethod
from dataclasses import dataclass
from uuid import UUID


@dataclass
class Credentials:
    # Credentials extracted from the request by the presentation layer (without
    # coupling the domain to the framework). Each authenticator uses only what it needs.
    bearer_token: str | None
    session_id: str | None


class Authenticator(ABC):
    @abstractmethod
    async def authenticate(self, credentials: Credentials) -> UUID | None:
        """Resolve the user_id if this scheme applies and is valid; otherwise None.

        Returning None = 'not me / invalid' → the chain tries the next one.
        """
        ...
