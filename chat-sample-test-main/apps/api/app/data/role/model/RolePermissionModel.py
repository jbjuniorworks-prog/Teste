from typing import TYPE_CHECKING
from uuid import UUID, uuid4
from sqlmodel import Relationship, SQLModel, Field
from sqlalchemy import UniqueConstraint

if TYPE_CHECKING:
    from app.data.role.model.RoleModel import RoleModel

class RolePermissionModel(SQLModel, table=True):
    __tablename__ = "role_permissions"

    __table_args__ = (
        UniqueConstraint("role_id", "permission", name="uq_role_permission"),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    role_id: UUID = Field(foreign_key="roles.id")
    permission: str = Field(index=True)
    role: "RoleModel" = Relationship(back_populates="permissions")