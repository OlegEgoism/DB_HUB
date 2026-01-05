# backend/schemas/agreements_schemas.py
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional


class AgreementBase(BaseModel):
    """Базовая схема для пользовательского соглашения"""
    number: str
    title: str
    content: str
    is_active: bool


class AgreementResponse(AgreementBase):
    """Схема для отображения пользовательского соглашения"""
    id: int
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)
