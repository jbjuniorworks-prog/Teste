from typing import TYPE_CHECKING
from uuid import UUID, uuid4
from sqlmodel import SQLModel, Field, Relationship

if TYPE_CHECKING:
    from app.data.user.model.UserModel import UserModel
    from app.data.role.model.RolePermissionModel import RolePermissionModel

class RoleModel(SQLModel, table=True):
    __tablename__ = "roles"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(unique=True, index=True)
    users: list["UserModel"] = Relationship(back_populates="role")
    permissions: list["RolePermissionModel"] = Relationship(back_populates="role")