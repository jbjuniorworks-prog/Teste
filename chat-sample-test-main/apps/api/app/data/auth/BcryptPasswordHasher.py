import asyncio

import bcrypt

from app.domain.auth.PasswordHasher import PasswordHasher


class BcryptPasswordHasher(PasswordHasher):
    async def hash(self, plain: str) -> str:
        # bcrypt is CPU-bound and slow on purpose. Running it directly would block the
        # event loop; to_thread offloads it to a thread and frees the loop while it computes.
        return await asyncio.to_thread(self._hash, plain)

    async def verify(self, plain: str, hashed: str) -> bool:
        return await asyncio.to_thread(self._verify, plain, hashed)

    def _hash(self, plain: str) -> str:
        return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()

    def _verify(self, plain: str, hashed: str) -> bool:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
