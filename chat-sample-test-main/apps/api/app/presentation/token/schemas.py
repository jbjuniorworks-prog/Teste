from datetime import datetime

from pydantic import BaseModel, ConfigDict


class TokenInfoResponse(BaseModel):
    # Metadata — without the token value.
    model_config = ConfigDict(from_attributes=True)

    prefix: str
    created_at: datetime


class TokenCreatedResponse(BaseModel):
    # Returned ONCE on creation/regeneration: the only moment with the plain value.
    token: str
    prefix: str
    created_at: datetime
