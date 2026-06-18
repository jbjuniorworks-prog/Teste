from typing import Annotated

from fastapi import Depends

from app.domain.role.usecase.GetAllRolesUseCase import GetAllRolesUseCase
from app.core.dependencies import RoleRepositoryDep


def get_all_roles_usecase(roles: RoleRepositoryDep) -> GetAllRolesUseCase:
    return GetAllRolesUseCase(roles)


GetAllRolesUseCaseDep = Annotated[GetAllRolesUseCase, Depends(get_all_roles_usecase)]
