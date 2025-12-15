# backend/models/db.py
from sqlalchemy import Column, Integer, String, Boolean, Text, Enum, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from backend.database.session import Base
from backend.models.base_mixin import DateTimeMixin

ENVIRONMENT_CHOICES = [
    ('production', 'Продакшн'),
    ('development', 'Разработка'),
    ('staging', 'Тестирование'),
    ('analytics', 'Аналитика'),
]

DATABASE_TYPES = [
    ('postgresql', 'PostgreSQL'),
]


class Connection(Base, DateTimeMixin):
    __tablename__ = "connection"

    id = Column(Integer, primary_key=True, index=True, comment="PK подключения")

    # Поля для подключения
    host = Column(String(255), nullable=False, comment="Хост")
    port = Column(Integer, nullable=False, comment="Порт")
    database_name = Column(String(255), nullable=False, comment="Название базы данных")
    username = Column(String(255), nullable=False, comment="Имя пользователя")
    password = Column(String(255), nullable=False, comment="Пароль пользователя")

    # Дополнительная информация
    name = Column(String(255), nullable=False, index=True, comment="Название подключения")
    description = Column(Text, nullable=True, comment="Описание базы данных")
    database_type = Column(Enum(*[t[0] for t in DATABASE_TYPES], name="database_type_enum"), nullable=False, comment="Тип базы данных")
    environment = Column(Enum(*[e[0] for e in ENVIRONMENT_CHOICES], name="environment_enum"), nullable=False, comment="Окружение")
    is_favorite = Column(Boolean, default=False, nullable=False, comment="Избранное")

    # Связь с владельцем
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, comment="ID владельца (пользователя)")
    owner = relationship("User", back_populates="connections")

    # Ограничение уникальности по комбинации полей
    __table_args__ = (UniqueConstraint("host", "port", "database_name", "username", "name", "owner_id", name="uq_connection_unique_fields"),)

    def __repr__(self):
        return f"<Connection(id={self.id}, name='{self.name}', type='{self.database_type}', owner_id={self.owner_id})>"