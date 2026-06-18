from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Column, DateTime
from sqlmodel import SQLModel, Field


class PersonalAccessTokenModel(SQLModel, table=True):
    __tablename__ = "personal_access_tokens"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    # unique: 1 token per user. index on the hash: fast lookup during auth (later).
    user_id: UUID = Field(foreign_key="users.id", unique=True, index=True)
    token_hash: str = Field(index=True)
    prefix: str
    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False)
    )
