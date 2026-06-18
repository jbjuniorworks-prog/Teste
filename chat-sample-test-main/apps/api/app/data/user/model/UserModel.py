from typing import TYPE_CHECKING
from uuid import UUID, uuid4
from sqlmodel import Relationship, SQLModel, Field

if TYPE_CHECKING:
    from app.data.role.model.RoleModel import RoleModel

class UserModel(SQLModel, table=True):
    __tablename__ = "users"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    email: str = Field(index=True, unique=True)
    name: str = Field(index=True)
    hashed_password: str
    role_id: UUID = Field(foreign_key="roles.id")
    role: "RoleModel" = Relationship(back_populates="users")