from uuid import UUID

from pydantic import BaseModel, ConfigDict


class UserReportRow(BaseModel):
    model_config = ConfigDict(extra="forbid")  # no stray fields

    name: str
    email: str
    role: str


class UserReportRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = "User Report"
    users: list[UserReportRow]


class GenerateDocumentResponse(BaseModel):
    id: UUID
    url: str
