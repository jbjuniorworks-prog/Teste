from abc import ABC, abstractmethod

from app.domain.upload.model.ExtractedUser import ExtractedUser


class PdfUserExtractor(ABC):
    """Extracts a list of users from an uploaded PDF.

    STABLE interface: in the real app this becomes a catalog product extractor. The
    PoC uses text (pdfplumber) + LLM structured output; swapping in vision is drop-in
    (only the adapter changes). Full extraction — no RAG, reads the entire document.
    """

    @abstractmethod
    async def extract(self, content: bytes) -> list[ExtractedUser]:
        ...
