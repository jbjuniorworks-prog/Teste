from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, TemplateNotFound, select_autoescape
from weasyprint import HTML

from app.domain.document.PdfRenderer import PdfRenderer
from app.domain.document.exceptions import TemplateNotFoundError

_TEMPLATES_DIR = Path(__file__).parent / "templates"


class WeasyPrintPdfRenderer(PdfRenderer):
    def __init__(self) -> None:
        self._env = Environment(
            loader=FileSystemLoader(str(_TEMPLATES_DIR)),
            autoescape=select_autoescape(["html", "xml"]),
        )

    def render(self, template_id: str, data: dict[str, Any]) -> bytes:
        try:
            template = self._env.get_template(f"{template_id}.html")
        except TemplateNotFound as exc:
            raise TemplateNotFoundError(template_id) from exc
        html = template.render(data=data)
        # base_url resolves the template's relative assets (css/fonts/images).
        return HTML(string=html, base_url=str(_TEMPLATES_DIR)).write_pdf()
