from abc import ABC, abstractmethod


class PasswordHasher(ABC):
    @abstractmethod
    async def hash(self, plain: str) -> str:
        """Generates the hash of a plaintext password."""
        ...

    @abstractmethod
    async def verify(self, plain: str, hashed: str) -> bool:
        """Checks whether the plaintext password matches the hash."""
        ...
