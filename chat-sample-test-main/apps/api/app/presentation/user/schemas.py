from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.presentation.role.schemas import RoleResponse


class CreateUserRequest(BaseModel):
    name: str = Field(min_length=1)
    email: str
    password: str = Field(min_length=1, max_length=72)
    role_id: UUID


class UpdateUserRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    email: str | None = None
    password: str | None = Field(default=None, min_length=1, max_length=72)
    role_id: UUID | None = None


class UserResponse(BaseModel):
    # from_attributes lets FastAPI build it from the entity (dataclass).
    # Since there is no hashed_password field here, it never leaks in the response.
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    email: str
    role: RoleResponse
