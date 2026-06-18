from uuid import UUID

from app.domain.chat.model.Chat import Chat
from app.domain.chat.repository.ChatRepository import ChatRepository


class GetUserChatsUseCase:
    def __init__(self, chats: ChatRepository) -> None:
        self._chats = chats

    async def execute(self, user_id: UUID) -> list[Chat]:
        return await self._chats.get_chats_by_user(user_id)
