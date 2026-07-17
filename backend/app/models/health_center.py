from sqlmodel import SQLModel, Field


class HealthCenter(SQLModel, table=True):
    __tablename__ = "health_centers"

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(max_length=200)
    district: str = Field(max_length=100)
    pincode: str = Field(default="", max_length=10)
    phone: str = Field(default="", max_length=20)
