from uuid import UUID

from app.domain.session.SessionStore import SessionStore


class LogoutAllUseCase:
    def __init__(self, sessions: SessionStore) -> None:
        self._sessions = sessions

    async def execute(self, user_id: UUID) -> None:
        await self._sessions.delete_all(user_id)
