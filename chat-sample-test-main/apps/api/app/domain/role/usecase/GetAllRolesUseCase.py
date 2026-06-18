from app.domain.role.model.Role import Role
from app.domain.role.repository.RoleRepository import RoleRepository


class GetAllRolesUseCase:
    def __init__(self, roles: RoleRepository) -> None:
        self._roles = roles

    async def execute(self) -> list[Role]:
        return await self._roles.get_all()
