from dataclasses import dataclass
from uuid import UUID

from app.domain.chat.exceptions import ChatNotFoundError
from app.domain.chat.model.Chat import Chat
from app.domain.chat.model.Message import Message
from app.domain.chat.model.MessageEvent import MessageEvent
from app.domain.chat.repository.ChatRepository import ChatRepository


@dataclass
class ChatHistory:
    chat: Chat
    messages: list[Message]
    events_by_message: dict[UUID, list[MessageEvent]]


class GetChatHistoryUseCase:
    """History from the database: messages + the curated trajectory of each run."""

    def __init__(self, chats: ChatRepository) -> None:
        self._chats = chats

    async def execute(self, *, user_id: UUID, chat_id: UUID) -> ChatHistory:
        chat = await self._chats.get_chat(chat_id)
        if chat is None or chat.user_id != user_id:
            raise ChatNotFoundError()

        messages = await self._chats.get_messages(chat_id)
        events_by_message: dict[UUID, list[MessageEvent]] = {}
        for message in messages:
            events = await self._chats.get_events(message.id)
            if events:
                events_by_message[message.id] = events

        return ChatHistory(chat=chat, messages=messages, events_by_message=events_by_message)
