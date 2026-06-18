from uuid import UUID

from app.domain.auth.Authenticator import Authenticator, Credentials
from app.domain.session.SessionStore import SessionStore


class SessionAuthenticator(Authenticator):
    def __init__(self, sessions: SessionStore) -> None:
        self._sessions = sessions

    async def authenticate(self, credentials: Credentials) -> UUID | None:
        if credentials.session_id is None:
            return None
        return await self._sessions.get_user_id(credentials.session_id)
