class ChatNotFoundError(Exception):
    """Chat not found (or does not belong to the user)."""


class RunNotFoundError(Exception):
    """Run (assistant message) not found or already expired."""
