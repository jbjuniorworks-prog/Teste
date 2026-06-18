from abc import ABC, abstractmethod


class ChatTitler(ABC):
    """Generates a short title from the conversation. Returns None when it's not
    yet possible to title (e.g. small talk) — then it's retried next turn."""

    @abstractmethod
    async def title(self, conversation: list[tuple[str, str]]) -> str | None:
        ...
