from abc import ABC, abstractmethod

from app.domain.chat.model.ChatJob import ChatJob


class ChatJobQueue(ABC):
    """Durable queue of runs. The API enqueues; the worker consumes (at-least-once)."""

    @abstractmethod
    async def enqueue(self, job: ChatJob) -> str:
        ...
