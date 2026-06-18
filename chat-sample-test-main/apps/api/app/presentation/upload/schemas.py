from uuid import UUID

from pydantic import BaseModel


class UploadResponse(BaseModel):
    id: UUID
    filename: str


class MatchedUserOut(BaseModel):
    email: str
    name: str
    role: str


class RoleMismatchOut(BaseModel):
    email: str
    name: str
    upload_role: str
    system_role: str


class UserListComparisonResponse(BaseModel):
    """Serialization of the diff. The field names make it clear which side each
    user came from — `only_in_upload` is what the document brought and does not
    exist in the system (it is not the truth, it creates nothing)."""

    matched: list[MatchedUserOut]
    role_mismatch: list[RoleMismatchOut]
    only_in_upload: list[MatchedUserOut]
    only_in_system: list[MatchedUserOut]
