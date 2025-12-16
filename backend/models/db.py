# backend/models/db.py
from sqlalchemy import Column, Integer, String, Boolean, Text, Enum, ForeignKey, UniqueConstraint, Index
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


class DB_Connection(Base, DateTimeMixin):
    __tablename__ = "db_connection"

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

    # Связь
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, comment="ID владельца (пользователя)")
    groups = relationship("DB_Group", back_populates="connection", cascade="all, delete-orphan", lazy="selectin")
    owner = relationship("User", back_populates="db_connection")

    # Ограничения и индексы
    __table_args__ = (
        UniqueConstraint("host", "port", "database_name", "username", "name", "owner_id", name="uq_connection_unique_fields"),

        Index('idx_connection_database_name_search', 'database_name'),
        Index('idx_connection_name_search', 'name'),
        Index('idx_connection_description_search', 'description'),
        Index('idx_connection_database_type_search', 'database_type'),
        Index('idx_connection_environment_search', 'environment'),
        Index('idx_connection_name_env_type', 'name', 'environment', 'database_type'),
        Index('idx_connection_dbname_env', 'database_name', 'environment'),
        Index('idx_connection_is_favorite', 'is_favorite'),
        Index('idx_connection_owner_id', 'owner_id'),
        Index('idx_connection_created_at', 'created_at'),
        Index('idx_connection_updated_at', 'updated_at'),
    )

    def __repr__(self):
        return f"<DB_Connection(id={self.id}, name='{self.name}', type='{self.database_type}', owner_id={self.owner_id})>"


class DB_Group(Base, DateTimeMixin):
    __tablename__ = "db_group"

    id = Column(Integer, primary_key=True, index=True, comment="PK группы")

    # Основные поля
    name = Column(String(255), nullable=False, index=True, comment="Название группы из внешней БД")
    description = Column(Text, nullable=True, comment="Описание группы")
    user_count = Column(Integer, default=0, nullable=False, comment="Количество пользователей в группе из внешней БД")

    # Связь
    connection_id = Column(Integer, ForeignKey("db_connection.id", ondelete="CASCADE"), nullable=False, comment="ID подключения к БД")
    connection = relationship("DB_Connection", back_populates="groups")

    # Ограничения и индексы
    __table_args__ = (
        UniqueConstraint("connection_id", "name", name="uq_db_group_connection_name"),

        Index("idx_db_group_name", "name"),
        Index("idx_db_group_connection_id", "connection_id"),
        Index("idx_db_group_user_count", "user_count"),
        Index("idx_db_group_created_at", "created_at"),
    )

    def __repr__(self):
        return f"<DB_Group(id={self.id}, name='{self.name}', connection_id={self.connection_id}, user_count={self.user_count})>"