from app.domain.role.model.Role import Role
from app.domain.permission.model.Permission import Permission
from app.data.role.model.RoleModel import RoleModel


class RoleMapper:
    @staticmethod
    def to_entity(model: RoleModel) -> Role:
        return Role(
            id=model.id,
            name=model.name,
            permissions={Permission(rp.permission) for rp in model.permissions},
        )
