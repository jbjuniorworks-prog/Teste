from app.domain.session.SessionStore import SessionStore


class LogoutUseCase:
    def __init__(self, sessions: SessionStore) -> None:
        self._sessions = sessions

    async def execute(self, session_id: str) -> None:
        await self._sessions.delete(session_id)
