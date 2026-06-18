"""Chatbot: POST starts the turn (background run) and GET watches it live (SSE).

Everything guarded by session (CurrentUserId). The POST returns quickly with the
run_id; the frontend opens the SSE at `/chat/{run_id}/stream`. History comes from
the database.
"""

import json
from uuid import UUID

from fastapi import APIRouter, Request, status
from fastapi.responses import StreamingResponse

from app.core.dependencies import CurrentUserId
from app.domain.chat.exceptions import RunNotFoundError
from app.domain.chat.model.ChatJob import ChatJob
from app.domain.chat.model.constants import MessageStatus
from app.presentation.chat.dependencies import (
    ChatEventStreamDep,
    ChatJobQueueDep,
    ChatRepositoryDep,
    GetChatHistoryUseCaseDep,
    GetUserChatsUseCaseDep,
    StartChatTurnUseCaseDep,
)
from app.presentation.chat.schemas import (
    ChatDetailResponse,
    ChatSummary,
    EventOut,
    MessageOut,
    SendMessageRequest,
    SendMessageResponse,
)

router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=SendMessageResponse, status_code=status.HTTP_202_ACCEPTED)
async def send_message(
    body: SendMessageRequest,
    user_id: CurrentUserId,
    start: StartChatTurnUseCaseDep,
    stream: ChatEventStreamDep,
    queue: ChatJobQueueDep,
) -> SendMessageResponse:
    started = await start.execute(
        user_id=user_id,
        chat_id=body.chat_id,
        message=body.message,
        attachment_ids=body.attachment_ids,
    )
    # pointer to the active run (for reattach after reload) + enqueues the run (worker runs it).
    await stream.set_active(started.chat_id, started.run_id)
    await queue.enqueue(
        ChatJob(
            run_id=started.run_id,
            chat_id=started.chat_id,
            user_id=user_id,
            user_message_id=started.user_message_id,
            message=body.message,
            attachment_ids=body.attachment_ids,
        )
    )

    return SendMessageResponse(
        chat_id=started.chat_id,
        run_id=started.run_id,
        stream_url=f"/chat/{started.run_id}/stream",
    )


@router.get("/chat/{run_id}/stream")
async def stream_run(
    run_id: UUID,
    request: Request,
    user_id: CurrentUserId,
    chats: ChatRepositoryDep,
    stream: ChatEventStreamDep,
) -> StreamingResponse:
    # Ownership: the run is the assistant's message; its chat must belong to the user.
    message = await chats.get_message(run_id)
    if message is None:
        raise RunNotFoundError()
    chat = await chats.get_chat(message.chat_id)
    if chat is None or chat.user_id != user_id:
        raise RunNotFoundError()

    # Run already finished and the stream expired (outside the TTL window) -> nothing
    # live; the client should read the history from the database. Avoids blocking the
    # SSE for nothing.
    run_expired = (
        message.status != MessageStatus.RUNNING and not await stream.exists(run_id)
    )

    # Native SSE resume: the browser resends Last-Event-ID = Redis Stream id.
    after = request.headers.get("last-event-id")

    async def event_source():
        if run_expired:
            return
        async for entry_id, event in stream.subscribe(run_id, after=after):
            etype = event.get("type", "message")
            yield f"id: {entry_id}\nevent: {etype}\ndata: {json.dumps(event)}\n\n"

    return StreamingResponse(
        event_source(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/chats", response_model=list[ChatSummary])
async def list_chats(
    user_id: CurrentUserId,
    usecase: GetUserChatsUseCaseDep,
) -> list[ChatSummary]:
    chats = await usecase.execute(user_id)
    return [ChatSummary.model_validate(chat) for chat in chats]


@router.get("/chats/{chat_id}", response_model=ChatDetailResponse)
async def get_chat_history(
    chat_id: UUID,
    user_id: CurrentUserId,
    usecase: GetChatHistoryUseCaseDep,
) -> ChatDetailResponse:
    history = await usecase.execute(user_id=user_id, chat_id=chat_id)
    messages = [
        MessageOut(
            id=m.id,
            role=m.role,
            content=m.content,
            status=m.status,
            error=m.error,
            meta=m.meta,
            created_at=m.created_at,
            completed_at=m.completed_at,
            events=[
                EventOut.model_validate(e)
                for e in history.events_by_message.get(m.id, [])
            ],
        )
        for m in history.messages
    ]
    return ChatDetailResponse(
        id=history.chat.id,
        title=history.chat.title,
        created_at=history.chat.created_at,
        updated_at=history.chat.updated_at,
        messages=messages,
    )
