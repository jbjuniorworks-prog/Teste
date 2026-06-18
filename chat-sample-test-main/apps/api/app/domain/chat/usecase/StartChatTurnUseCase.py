from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import UUID, uuid4

from app.domain.chat.exceptions import ChatNotFoundError
from app.domain.chat.model.Chat import Chat
from app.domain.chat.model.Message import Message
from app.domain.chat.model.constants import MessageRole, MessageStatus
from app.domain.chat.repository.ChatRepository import ChatRepository


@dataclass
class StartedTurn:
    chat_id: UUID
    user_message_id: UUID
    run_id: UUID            # = id of the assistant message


class StartChatTurnUseCase:
    """Synchronous part of the POST: creates/continues the chat and writes the
    user message + the assistant placeholder (running). Returns the ids; the run
    runs in the background.
    """

    def __init__(self, chats: ChatRepository) -> None:
        self._chats = chats

    async def execute(
        self,
        *,
        user_id: UUID,
        chat_id: UUID | None,
        message: str,
        attachment_ids: list[UUID] | None = None,
    ) -> StartedTurn:
        now = datetime.now(timezone.utc)

        chat_to_create: Chat | None = None
        if chat_id is None:
            chat_to_create = Chat(
                id=uuid4(),
                user_id=user_id,
                title="New Chat",
                created_at=now,
                updated_at=now,
            )
            chat_id = chat_to_create.id
        else:
            existing = await self._chats.get_chat(chat_id)
            if existing is None or existing.user_id != user_id:
                raise ChatNotFoundError()

        # attachments live in the user message meta -> rehydrates the chip in history.
        user_meta = (
            {"attachment_ids": [str(aid) for aid in attachment_ids]}
            if attachment_ids
            else None
        )
        user_message = Message(
            id=uuid4(),
            chat_id=chat_id,
            role=MessageRole.USER,
            content=message,
            status=None,
            error=None,
            meta=user_meta,
            created_at=now,
            completed_at=now,
        )
        assistant_message = Message(
            id=uuid4(),
            chat_id=chat_id,
            role=MessageRole.ASSISTANT,
            content=None,
            status=MessageStatus.RUNNING,
            error=None,
            meta=None,
            created_at=now,
            completed_at=None,
        )

        await self._chats.start_turn(chat_to_create, user_message, assistant_message)
        return StartedTurn(
            chat_id=chat_id,
            user_message_id=user_message.id,
            run_id=assistant_message.id,
        )
