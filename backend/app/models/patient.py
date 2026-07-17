from datetime import datetime, timezone
from sqlmodel import SQLModel, Field


class Patient(SQLModel, table=True):
    __tablename__ = "patients"

    id: int | None = Field(default=None, primary_key=True)
    phone: str = Field(default="", index=True, max_length=20)
    name: str = Field(default="", max_length=200)
    language: str = Field(default="mr", max_length=10)
    district: str = Field(default="", max_length=100)
    abha_id: str = Field(default="", max_length=20, description="Ayushman Bharat Health Account ID")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
