from fastapi import APIRouter, Response

from app.core.config import settings
from app.presentation.auth.schemas import LoginRequest
from app.presentation.user.schemas import UserResponse
from app.core.dependencies import SessionIdDep, CurrentUserId
from app.presentation.auth.dependencies import (
    LoginUseCaseDep,
    LogoutUseCaseDep,
    LogoutAllUseCaseDep,
)
from app.presentation.user.dependencies import GetUserUseCaseDep

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
async def login(
    body: LoginRequest,
    response: Response,
    usecase: LoginUseCaseDep,
) -> dict[str, str]:
    # InvalidCredentialsError bubbles up to the global handler -> 401 AUTH_INVALID_CREDENTIALS.
    session_id = await usecase.execute(body.email, body.password)

    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=session_id,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.SESSION_ABSOLUTE_TTL,
    )
    return {"status": "ok"}


@router.get("/me", response_model=UserResponse)
async def me(
    user_id: CurrentUserId,
    usecase: GetUserUseCaseDep,
):
    # Current user + role + permissions. Next uses it to decide the UI server-side.
    return await usecase.execute(user_id)


@router.post("/logout")
async def logout(
    response: Response,
    session_id: SessionIdDep,
    usecase: LogoutUseCaseDep,
) -> dict[str, str]:
    await usecase.execute(session_id)
    response.delete_cookie(settings.COOKIE_NAME)
    return {"status": "ok"}


@router.post("/logout-all")
async def logout_all(
    response: Response,
    user_id: CurrentUserId,
    usecase: LogoutAllUseCaseDep,
) -> dict[str, str]:
    await usecase.execute(user_id)
    response.delete_cookie(settings.COOKIE_NAME)
    return {"status": "ok"}
