from abc import ABC, abstractmethod


class TokenHasher(ABC):
    @abstractmethod
    def hash(self, plain: str) -> str:
        """Deterministic hash of the token (allows indexed lookup by hash)."""
        ...
