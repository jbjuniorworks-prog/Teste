from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.domain.permission.model.Permission import Permission


class RoleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    permissions: list[Permission]
