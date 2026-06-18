import hashlib

from app.domain.token.TokenHasher import TokenHasher


class Sha256TokenHasher(TokenHasher):
    def hash(self, plain: str) -> str:
        # Token is high-entropy random: a deterministic sha256 is enough and
        # allows lookup by hash (unlike bcrypt, which is salted/non-indexable).
        return hashlib.sha256(plain.encode()).hexdigest()
