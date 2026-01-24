# backend/models/base_mixin.py

from sqlalchemy import Column, DateTime, func
from sqlalchemy.ext.declarative import declared_attr


class DateTimeMixin:
    """Временные метки создания и обновления"""

    @declared_attr
    def created_at(cls):
        return Column(
            DateTime(timezone=True),
            server_default=func.now(),
            nullable=False,
            comment="Дата и время создания записи",
        )

    @declared_attr
    def updated_at(cls):
        return Column(
            DateTime(timezone=True),
            server_default=func.now(),
            onupdate=func.now(),
            nullable=False,
            comment="Дата и время обновления записи",
        )
