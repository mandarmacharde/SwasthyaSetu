from datetime import datetime, timezone
from sqlmodel import SQLModel, Field, Column, Text


class Case(SQLModel, table=True):
    __tablename__ = "cases"

    id: int | None = Field(default=None, primary_key=True)
    session_id: str = Field(unique=True, index=True, max_length=20)
    patient_id: int | None = Field(default=None, foreign_key="patients.id", index=True)
    assigned_to: int | None = Field(default=None, foreign_key="users.id", index=True)
    urgency: str = Field(default="medium", max_length=20)
    possible_category: str = Field(default="", max_length=100)
    transcript: str = Field(default="", sa_type=Text)
    triage_summary: str = Field(default="", sa_type=Text)
    status: str = Field(default="open", max_length=20)  # open | assigned | visited | closed
    language: str = Field(default="mr", max_length=10)
    callback_number: str = Field(default="", max_length=20)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column_kwargs={"onupdate": lambda: datetime.now(timezone.utc)},
    )
