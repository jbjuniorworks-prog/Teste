from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.domain.auth.exceptions import (
    InvalidCredentialsError,
    NotAuthenticatedError,
    PermissionDeniedError,
)
from app.domain.user.exceptions import UserNotFoundError, EmailAlreadyExistsError
from app.domain.role.exceptions import RoleNotFoundError
from app.domain.chat.exceptions import ChatNotFoundError, RunNotFoundError
from app.domain.document.exceptions import (
    DocumentNotFoundError,
    TemplateNotFoundError,
)
from app.domain.upload.exceptions import ExtractionError, UploadNotFoundError


def _error_response(
    status_code: int,
    code: str,
    message: str,
    details: list | None = None,
) -> JSONResponse:
    payload: dict = {"code": code, "message": message}
    if details is not None:
        payload["details"] = details
    return JSONResponse(status_code=status_code, content={"error": payload})


# Domain exception -> (HTTP status, stable code, default message).
# Single source of the domain -> HTTP contract mapping.
_DOMAIN_MAP: dict[type[Exception], tuple[int, str, str]] = {
    InvalidCredentialsError: (401, "AUTH_INVALID_CREDENTIALS", "Invalid credentials"),
    NotAuthenticatedError: (401, "NOT_AUTHENTICATED", "Not authenticated"),
    PermissionDeniedError: (403, "PERMISSION_DENIED", "Insufficient permissions"),
    UserNotFoundError: (404, "USER_NOT_FOUND", "User not found"),
    EmailAlreadyExistsError: (409, "EMAIL_ALREADY_EXISTS", "Email already exists"),
    RoleNotFoundError: (422, "ROLE_NOT_FOUND", "Role not found"),
    ChatNotFoundError: (404, "CHAT_NOT_FOUND", "Chat not found"),
    RunNotFoundError: (404, "RUN_NOT_FOUND", "Run not found"),
    TemplateNotFoundError: (422, "TEMPLATE_NOT_FOUND", "Document template not found"),
    DocumentNotFoundError: (404, "DOCUMENT_NOT_FOUND", "Document not found"),
    UploadNotFoundError: (404, "UPLOAD_NOT_FOUND", "Upload not found"),
    ExtractionError: (422, "EXTRACTION_FAILED", "Could not extract users from the document"),
}

# For errors that do not go through a domain exception (e.g. 404 of a nonexistent route).
_HTTP_CODE_NAMES: dict[int, str] = {
    400: "BAD_REQUEST",
    401: "NOT_AUTHENTICATED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    405: "METHOD_NOT_ALLOWED",
    409: "CONFLICT",
}


def _make_domain_handler(status_code: int, code: str, message: str):
    async def handler(request: Request, exc: Exception) -> JSONResponse:
        return _error_response(status_code, code, message)

    return handler


async def _validation_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    details = [
        {
            "field": ".".join(str(part) for part in err["loc"]),
            "message": err["msg"],
            "type": err["type"],
        }
        for err in exc.errors()
    ]
    return _error_response(
        422, "VALIDATION_ERROR", "Request validation failed", details
    )


async def _http_handler(
    request: Request, exc: StarletteHTTPException
) -> JSONResponse:
    code = _HTTP_CODE_NAMES.get(exc.status_code, "HTTP_ERROR")
    message = exc.detail if isinstance(exc.detail, str) else "Error"
    return _error_response(exc.status_code, code, message)


def register_error_handlers(app: FastAPI) -> None:
    for exc_type, (status_code, code, message) in _DOMAIN_MAP.items():
        app.add_exception_handler(
            exc_type, _make_domain_handler(status_code, code, message)
        )
    app.add_exception_handler(RequestValidationError, _validation_handler)
    app.add_exception_handler(StarletteHTTPException, _http_handler)
