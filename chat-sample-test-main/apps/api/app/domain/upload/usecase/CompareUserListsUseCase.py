from uuid import UUID

from app.domain.upload.PdfUserExtractor import PdfUserExtractor
from app.domain.upload.UploadStorage import UploadStorage
from app.domain.upload.exceptions import ExtractionError, UploadNotFoundError
from app.domain.upload.model.UserListComparison import (
    MatchedUser,
    RoleMismatch,
    UserListComparison,
)
from app.domain.upload.repository.UploadRepository import UploadRepository
from app.domain.user.repository.UserRepository import UserRepository


class CompareUserListsUseCase:
    """Compares the user list from the uploaded PDF with the SYSTEM users.

    The "system" side always comes from the UserRepository (DB) — never from what the
    human typed. The "upload" side is only what the document brought. The diff is
    deterministic (exact code), by normalized email; the agent only calls and explains.
    """

    def __init__(
        self,
        uploads: UploadRepository,
        storage: UploadStorage,
        extractor: PdfUserExtractor,
        users: UserRepository,
    ) -> None:
        self._uploads = uploads
        self._storage = storage
        self._extractor = extractor
        self._users = users

    async def execute(
        self, *, upload_id: UUID, requester_id: UUID
    ) -> UserListComparison:
        upload = await self._uploads.get(upload_id)
        if upload is None or upload.user_id != requester_id:
            raise UploadNotFoundError()

        content = await self._storage.load(upload_id)
        if content is None:
            raise UploadNotFoundError()

        try:
            extracted = await self._extractor.extract(content)
        except Exception as exc:  # noqa: BLE001 — becomes 422 in the contract
            raise ExtractionError(str(exc)) from exc

        system_users = await self._users.get_all()

        # Index both sides by normalized email (deterministic match key).
        upload_by_email = {self._norm(u.email): u for u in extracted}
        system_by_email = {self._norm(u.email): u for u in system_users}

        comparison = UserListComparison()
        for email, up in upload_by_email.items():
            sys_user = system_by_email.get(email)
            if sys_user is None:
                comparison.only_in_upload.append(
                    MatchedUser(email=up.email, name=up.name, role=up.role)
                )
            elif self._norm(up.role) != self._norm(sys_user.role.name):
                comparison.role_mismatch.append(
                    RoleMismatch(
                        email=sys_user.email,
                        name=sys_user.name,
                        upload_role=up.role,
                        system_role=sys_user.role.name,
                    )
                )
            else:
                comparison.matched.append(
                    MatchedUser(
                        email=sys_user.email, name=sys_user.name, role=sys_user.role.name
                    )
                )

        for email, sys_user in system_by_email.items():
            if email not in upload_by_email:
                comparison.only_in_system.append(
                    MatchedUser(
                        email=sys_user.email, name=sys_user.name, role=sys_user.role.name
                    )
                )

        return comparison

    @staticmethod
    def _norm(value: str) -> str:
        return value.strip().lower()
