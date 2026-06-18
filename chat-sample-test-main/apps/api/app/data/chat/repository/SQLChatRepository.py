from datetime import datetime
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.data.chat.mapper.ChatMapper import ChatMapper
from app.data.chat.model.ChatModel import ChatModel
from app.data.chat.model.MessageModel import MessageModel
from app.data.chat.model.MessageEventModel import MessageEventModel
from app.domain.chat.model.Chat import Chat
from app.domain.chat.model.Message import Message
from app.domain.chat.model.MessageEvent import MessageEvent
from app.domain.chat.model.constants import MessageRole, MessageStatus
from app.domain.chat.repository.ChatRepository import ChatRepository


class SQLChatRepository(ChatRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def start_turn(
        self,
        chat: Chat | None,
        user_message: Message,
        assistant_message: Message,
    ) -> None:
        if chat is not None:
            self._session.add(
                ChatModel(
                    id=chat.id,
                    user_id=chat.user_id,
                    title=chat.title,
                    created_at=chat.created_at,
                    updated_at=chat.updated_at,
                )
            )
        self._session.add(self._to_message_model(user_message))
        self._session.add(self._to_message_model(assistant_message))
        await self._session.commit()

    async def finalize_run(
        self,
        *,
        run_id: UUID,
        content: str | None,
        status: str,
        error: str | None,
        meta: dict | None,
        completed_at: datetime,
        events: list[MessageEvent],
    ) -> None:
        result = await self._session.execute(
            select(MessageModel).where(MessageModel.id == run_id)
        )
        message = result.scalar_one_or_none()
        if message is None:
            return  # run vanished (should not happen) — nothing to do

        message.content = content
        message.status = status
        message.error = error
        message.meta = meta
        message.completed_at = completed_at

        for event in events:
            self._session.add(
                MessageEventModel(
                    id=event.id,
                    chat_id=event.chat_id,
                    message_id=event.message_id,
                    seq=event.seq,
                    type=event.type,
                    owner=event.owner,
                    payload=event.payload,
                    created_at=event.created_at,
                )
            )

        await self._session.execute(
            update(ChatModel)
            .where(ChatModel.id == message.chat_id)
            .values(updated_at=completed_at)
        )
        await self._session.commit()

    async def set_title(self, chat_id: UUID, title: str) -> None:
        await self._session.execute(
            update(ChatModel).where(ChatModel.id == chat_id).values(title=title)
        )
        await self._session.commit()

    async def get_chat(self, chat_id: UUID) -> Chat | None:
        result = await self._session.execute(
            select(ChatModel).where(ChatModel.id == chat_id)
        )
        model = result.scalar_one_or_none()
        return ChatMapper.chat(model) if model is not None else None

    async def get_chats_by_user(self, user_id: UUID) -> list[Chat]:
        result = await self._session.execute(
            select(ChatModel)
            .where(ChatModel.user_id == user_id)
            .order_by(ChatModel.updated_at.desc())
        )
        return [ChatMapper.chat(m) for m in result.scalars().all()]

    async def get_message(self, message_id: UUID) -> Message | None:
        result = await self._session.execute(
            select(MessageModel).where(MessageModel.id == message_id)
        )
        model = result.scalar_one_or_none()
        return ChatMapper.message(model) if model is not None else None

    async def get_messages(self, chat_id: UUID) -> list[Message]:
        result = await self._session.execute(
            select(MessageModel)
            .where(MessageModel.chat_id == chat_id)
            .order_by(MessageModel.created_at)
        )
        return [ChatMapper.message(m) for m in result.scalars().all()]

    async def get_events(self, message_id: UUID) -> list[MessageEvent]:
        result = await self._session.execute(
            select(MessageEventModel)
            .where(MessageEventModel.message_id == message_id)
            .order_by(MessageEventModel.seq)
        )
        return [ChatMapper.event(m) for m in result.scalars().all()]

    async def fail_stale_runs(self, older_than: datetime) -> int:
        result = await self._session.execute(
            update(MessageModel)
            .where(
                MessageModel.role == MessageRole.ASSISTANT,
                MessageModel.status == MessageStatus.RUNNING,
                MessageModel.created_at < older_than,
            )
            .values(status=MessageStatus.FAILED, error="stale run (worker recovery)")
        )
        await self._session.commit()
        return result.rowcount or 0

    @staticmethod
    def _to_message_model(message: Message) -> MessageModel:
        return MessageModel(
            id=message.id,
            chat_id=message.chat_id,
            role=message.role,
            content=message.content,
            status=message.status,
            error=message.error,
            meta=message.meta,
            created_at=message.created_at,
            completed_at=message.completed_at,
        )
