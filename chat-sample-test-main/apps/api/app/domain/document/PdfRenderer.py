from abc import ABC, abstractmethod
from typing import Any


class PdfRenderer(ABC):
    """Renders a template (filled with `data`) into PDF bytes."""

    @abstractmethod
    def render(self, template_id: str, data: dict[str, Any]) -> bytes:
        ...
