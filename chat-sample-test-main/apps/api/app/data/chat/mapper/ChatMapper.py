from app.data.chat.model.ChatModel import ChatModel
from app.data.chat.model.MessageModel import MessageModel
from app.data.chat.model.MessageEventModel import MessageEventModel
from app.domain.chat.model.Chat import Chat
from app.domain.chat.model.Message import Message
from app.domain.chat.model.MessageEvent import MessageEvent


class ChatMapper:
    @staticmethod
    def chat(model: ChatModel) -> Chat:
        return Chat(
            id=model.id,
            user_id=model.user_id,
            title=model.title,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    @staticmethod
    def message(model: MessageModel) -> Message:
        return Message(
            id=model.id,
            chat_id=model.chat_id,
            role=model.role,
            content=model.content,
            status=model.status,
            error=model.error,
            meta=model.meta,
            created_at=model.created_at,
            completed_at=model.completed_at,
        )

    @staticmethod
    def event(model: MessageEventModel) -> MessageEvent:
        return MessageEvent(
            id=model.id,
            chat_id=model.chat_id,
            message_id=model.message_id,
            seq=model.seq,
            type=model.type,
            owner=model.owner,
            payload=model.payload,
            created_at=model.created_at,
        )
