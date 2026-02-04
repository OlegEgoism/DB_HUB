# backend/schemas/app_agreements_schemas.py

from pydantic import BaseModel, ConfigDict


class AgreementBase(BaseModel):
    """Базовая схема для пользовательского соглашения"""

    number: str
    title: str
    content: str
    is_active: bool


class AgreementResponse(AgreementBase):
    """Схема для отображения пользовательского соглашения"""

    id: int
    model_config = ConfigDict(from_attributes=True)
