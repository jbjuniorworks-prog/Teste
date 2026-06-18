from dataclasses import dataclass
from uuid import UUID


@dataclass
class GeneratedDocument:
    id: UUID
    url: str
