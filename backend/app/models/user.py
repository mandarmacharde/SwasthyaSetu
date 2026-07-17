from datetime import datetime, timezone
from sqlmodel import SQLModel, Field


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(max_length=200)
    phone: str = Field(unique=True, index=True, max_length=20)
    role: str = Field(max_length=20)  # asha | doctor | admin
    district: str = Field(default="", max_length=100)
    health_center_id: int | None = Field(default=None, foreign_key="health_centers.id")
    password_hash: str = Field(default="", max_length=200)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
