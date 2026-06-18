from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

from app.domain.permission.model.Permission import Permission
from app.presentation.role.schemas import RoleResponse
from app.core.dependencies import require_permission
from app.presentation.role.dependencies import GetAllRolesUseCaseDep

router = APIRouter(prefix="/roles", tags=["roles"])


@router.get("", response_model=list[RoleResponse])
async def list_roles(
    _: Annotated[UUID, Depends(require_permission(Permission.ROLES_GET_ALL))],
    usecase: GetAllRolesUseCaseDep,
) -> list:
    return await usecase.execute()
