"""Documents: generates a PDF from a fixed template + STRICT (validated) data.

Each document has its own typed endpoint (no free-form `data`). We start with the
User Report. POST guarded by session (+ Idempotency-Key by the middleware).
"""

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Response, status

from app.core.dependencies import CurrentUserId
from app.presentation.document.dependencies import (
    GenerateDocumentUseCaseDep,
    GetDocumentUseCaseDep,
)
from app.presentation.document.schemas import (
    GenerateDocumentResponse,
    UserReportRequest,
)

router = APIRouter(tags=["documents"])


@router.post(
    "/documents/user-report",
    response_model=GenerateDocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def generate_user_report(
    body: UserReportRequest,
    user_id: CurrentUserId,
    usecase: GenerateDocumentUseCaseDep,
) -> GenerateDocumentResponse:
    # generated_at is controlled by the backend (does not come from the client).
    data = {
        "title": body.title,
        "generated_at": datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M UTC"),
        "users": [row.model_dump() for row in body.users],
    }
    doc = await usecase.execute("user_report", data)
    return GenerateDocumentResponse(id=doc.id, url=doc.url)


@router.get("/documents/{document_id}")
async def get_document(
    document_id: UUID,
    user_id: CurrentUserId,
    usecase: GetDocumentUseCaseDep,
) -> Response:
    pdf = await usecase.execute(document_id)
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{document_id}.pdf"'},
    )
