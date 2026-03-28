# backend/schemas/app_content_schemas.py
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AppContentBase(BaseModel):
    content_type: str = Field(..., min_length=1, max_length=20, description="Тип контента")
    number: str = Field(..., max_length=50, description="Порядковый номер")
    title: str = Field(..., max_length=100, description="Заголовок")
    content: str = Field(..., description="Содержание")
    is_active: bool = Field(default=False, description="Активность")


class AppContentCreate(BaseModel):
    content_type: str = Field(..., min_length=1, max_length=20)
    number: str
    title: str
    content: str
    is_active: bool = False


class AppContentUpdate(BaseModel):
    content_type: str | None = Field(None, min_length=1, max_length=20, description="Тип контента")
    number: str | None = Field(None, max_length=50, description="Порядковый номер")
    title: str | None = Field(None, max_length=100, description="Заголовок")
    content: str | None = Field(None, description="Содержание")
    is_active: bool | None = Field(None, description="Активность")
    model_config = {"extra": "forbid"}


class AppContentResponse(AppContentBase):
    id: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class PaginatedAppContentResponse(BaseModel):
    items: list[AppContentResponse]
    total: int
    page: int
    size: int
    pages: int
    has_next: bool
    has_prev: bool
    model_config = ConfigDict(from_attributes=True)
