from typing import Annotated

from fastapi import Depends

from app.core.dependencies import RedisDep, SessionDep
from app.data.chat.RedisChatEventStream import RedisChatEventStream
from app.data.chat.RedisChatJobQueue import RedisChatJobQueue
from app.data.chat.repository.SQLChatRepository import SQLChatRepository
from app.domain.chat.ChatEventStream import ChatEventStream
from app.domain.chat.ChatJobQueue import ChatJobQueue
from app.domain.chat.repository.ChatRepository import ChatRepository
from app.domain.chat.usecase.GetChatHistoryUseCase import GetChatHistoryUseCase
from app.domain.chat.usecase.GetUserChatsUseCase import GetUserChatsUseCase
from app.domain.chat.usecase.StartChatTurnUseCase import StartChatTurnUseCase


def get_chat_repository(session: SessionDep) -> ChatRepository:
    return SQLChatRepository(session)


ChatRepositoryDep = Annotated[ChatRepository, Depends(get_chat_repository)]


def get_chat_event_stream(redis: RedisDep) -> ChatEventStream:
    return RedisChatEventStream(redis)


ChatEventStreamDep = Annotated[ChatEventStream, Depends(get_chat_event_stream)]


def get_chat_job_queue(redis: RedisDep) -> ChatJobQueue:
    return RedisChatJobQueue(redis)


ChatJobQueueDep = Annotated[ChatJobQueue, Depends(get_chat_job_queue)]


def get_start_chat_turn_usecase(chats: ChatRepositoryDep) -> StartChatTurnUseCase:
    return StartChatTurnUseCase(chats)


StartChatTurnUseCaseDep = Annotated[
    StartChatTurnUseCase, Depends(get_start_chat_turn_usecase)
]


def get_user_chats_usecase(chats: ChatRepositoryDep) -> GetUserChatsUseCase:
    return GetUserChatsUseCase(chats)


GetUserChatsUseCaseDep = Annotated[GetUserChatsUseCase, Depends(get_user_chats_usecase)]


def get_chat_history_usecase(chats: ChatRepositoryDep) -> GetChatHistoryUseCase:
    return GetChatHistoryUseCase(chats)


GetChatHistoryUseCaseDep = Annotated[
    GetChatHistoryUseCase, Depends(get_chat_history_usecase)
]
