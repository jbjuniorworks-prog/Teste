from app.domain.user.repository.UserRepository import UserRepository
from app.domain.auth.PasswordHasher import PasswordHasher
from app.domain.session.SessionStore import SessionStore
from app.domain.auth.exceptions import InvalidCredentialsError

# Fixed hash just to spend the same time as a real verify when the email does
# not exist — prevents discovering valid emails by measuring response latency.
_DUMMY_HASH = "$2b$12$4U/re/l/CqYDM6rnt.YJWewMkHUQylacouhrxmPX6virobgy3cM9S"


class LoginUseCase:
    def __init__(
        self,
        users: UserRepository,
        hasher: PasswordHasher,
        sessions: SessionStore,
    ) -> None:
        self._users = users
        self._hasher = hasher
        self._sessions = sessions

    async def execute(self, email: str, password: str) -> str:
        user = await self._users.get_by_email(email)

        if user is None:
            # Run a throwaway verify to keep the time constant, then fail.
            await self._hasher.verify(password, _DUMMY_HASH)
            raise InvalidCredentialsError()

        if not await self._hasher.verify(password, user.hashed_password):
            raise InvalidCredentialsError()

        return await self._sessions.create(user.id)
