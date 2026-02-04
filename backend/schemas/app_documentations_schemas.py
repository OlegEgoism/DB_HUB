# backend/schemas/app_documentations_schemas.py
from pydantic import BaseModel, ConfigDict


class DocumentationBase(BaseModel):
    """Базовая схема для документации"""

    number: str
    title: str
    content: str
    is_active: bool


class DocumentationResponse(DocumentationBase):
    """Схема для отображения документации"""

    id: int
    model_config = ConfigDict(from_attributes=True)
