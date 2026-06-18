from fastapi import APIRouter, status

from app.core.dependencies import CurrentUserId
from app.presentation.token.schemas import TokenInfoResponse, TokenCreatedResponse
from app.presentation.token.dependencies import (
    IssueTokenUseCaseDep,
    GetMyTokenUseCaseDep,
    DeleteMyTokenUseCaseDep,
)

# Gated by session only (CurrentUserId): each user manages their OWN token,
# without requiring a special permission.
router = APIRouter(prefix="/tokens", tags=["tokens"])


@router.get("", response_model=TokenInfoResponse | None)
async def get_my_token(
    user_id: CurrentUserId,
    usecase: GetMyTokenUseCaseDep,
):
    return await usecase.execute(user_id)


@router.post("", response_model=TokenCreatedResponse, status_code=status.HTTP_201_CREATED)
async def issue_token(
    user_id: CurrentUserId,
    usecase: IssueTokenUseCaseDep,
) -> TokenCreatedResponse:
    # Creates or regenerates (deletes the previous one). Only moment the value is exposed.
    plaintext, info = await usecase.execute(user_id)
    return TokenCreatedResponse(
        token=plaintext,
        prefix=info.prefix,
        created_at=info.created_at,
    )


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_token(
    user_id: CurrentUserId,
    usecase: DeleteMyTokenUseCaseDep,
) -> None:
    await usecase.execute(user_id)
