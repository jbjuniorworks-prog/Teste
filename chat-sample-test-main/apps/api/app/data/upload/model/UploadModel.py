from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Column, DateTime
from sqlmodel import Field, SQLModel


class UploadModel(SQLModel, table=True):
    __tablename__ = "uploads"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", index=True)
    filename: str
    content_type: str
    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False)
    )
