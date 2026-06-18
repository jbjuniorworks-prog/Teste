from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass
class Upload:
    """Metadata of a file uploaded by the user. The bytes live in UploadStorage."""

    id: UUID
    user_id: UUID
    filename: str
    content_type: str
    created_at: datetime
