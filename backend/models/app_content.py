# backend/models/app_content.py
from enum import Enum

from sqlalchemy import Boolean, Column, Index, Integer, String, Text, UniqueConstraint

from backend.database.session import Base
from backend.models.base_mixin import DateTimeMixin


class ContentTypeEnum(str, Enum):
    AGREEMENT = "agreement"
    DOCUMENTATION = "documentation"


class AppContent(Base, DateTimeMixin):
    __tablename__ = "app_content"
    id = Column(Integer, primary_key=True, index=True, comment="PK контента приложения")
    content_type = Column(String(20), nullable=False, index=True, comment="Тип контента: agreement или documentation")
    number = Column(String(50), nullable=False, index=True, comment="Порядковый номер")
    title = Column(String(100), nullable=False, comment="Заголовок")
    content = Column(Text, nullable=False, comment="Содержание")
    is_active = Column(Boolean, default=False, nullable=False, comment="Активность")

    __table_args__ = (
        UniqueConstraint("content_type", "number", name="uq_content_type_number"),
        UniqueConstraint("content_type", "title", name="uq_content_type_title"),
        Index("idx_app_content_type", "content_type"),
        Index("idx_app_content_is_active", "is_active"),
    )

    def __repr__(self):
        return f"<AppContent(id={self.id}, type='{self.content_type}', number='{self.number}', title='{self.title[:30]}...')>"

    def to_dict(self):
        """Преобразование в словарь для удобного использования"""
        return {
            "id": self.id,
            "content_type": self.content_type,
            "number": self.number,
            "title": self.title,
            "content": self.content,
            "is_active": self.is_active,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }
