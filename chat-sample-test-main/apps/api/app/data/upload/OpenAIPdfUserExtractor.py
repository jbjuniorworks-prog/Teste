"""Extract users from a PDF: text (pdfplumber) -> strict LLM structured output.

In the real app this adapter becomes the catalog's product extraction; swapping
text for vision is drop-in (the PdfUserExtractor interface does not change). It
reads the whole document (no RAG) — RAG/embedding is reserved for the catalog,
not for the uploaded PDF.
"""

import asyncio
import io

import pdfplumber
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, ConfigDict, Field

from app.core.config import settings
from app.core.llm_http import llm_async_http_client, llm_http_client
from app.domain.upload.PdfUserExtractor import PdfUserExtractor
from app.domain.upload.model.ExtractedUser import ExtractedUser


class _ExtractedUser(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(description="User's full name")
    email: str = Field(description="User's email")
    role: str = Field(description="User's role, e.g. admin, user")


class _ExtractedUserList(BaseModel):
    model_config = ConfigDict(extra="forbid")

    users: list[_ExtractedUser] = Field(
        description="All users found in the document"
    )


_PROMPT = (
    "Extract the list of users from the document text below. For each user, return "
    "name, email and role. Use only what is in the text — do not make up users or "
    "fields. If a field is missing, leave it as an empty string.\n\n"
    "Document:\n{text}"
)


class OpenAIPdfUserExtractor(PdfUserExtractor):
    def __init__(self) -> None:
        self._llm = ChatOpenAI(
            model=settings.AGENT_MODEL,
            api_key=settings.OPENAI_API_KEY,
            temperature=0,
            http_client=llm_http_client(),
            http_async_client=llm_async_http_client(),
        ).with_structured_output(_ExtractedUserList)

    async def extract(self, content: bytes) -> list[ExtractedUser]:
        text = await asyncio.to_thread(self._read_text, content)
        result: _ExtractedUserList = await self._llm.ainvoke(_PROMPT.format(text=text))
        return [
            ExtractedUser(name=u.name, email=u.email, role=u.role) for u in result.users
        ]

    @staticmethod
    def _read_text(content: bytes) -> str:
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            return "\n".join(page.extract_text() or "" for page in pdf.pages)
