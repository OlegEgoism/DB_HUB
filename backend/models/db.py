# backend/models/db.py

from sqlalchemy import (
    Boolean,
    Column,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from backend.database.session import Base
from backend.models.base_mixin import DateTimeMixin

ENVIRONMENT_CHOICES = [
    ("production", "Продакшн"),
    ("development", "Разработка"),
    ("testing", "Тестирование"),
    ("analytics", "Аналитика"),
]

DATABASE_TYPES = [
    ("postgresql", "PostgreSQL"),
    ("greenplum", "Greenplum"),
]


class DB_Connection(Base, DateTimeMixin):
    __tablename__ = "db_connection"
    id = Column(Integer, primary_key=True, index=True, comment="PK подключения")
    database_name = Column(String(255), nullable=False, comment="Название базы данных")
    host = Column(String(255), nullable=False, comment="Хост")
    port = Column(Integer, nullable=False, comment="Порт")
    username = Column(String(255), nullable=False, comment="Имя пользователя")
    password = Column(String(255), nullable=False, comment="Пароль пользователя")
    description = Column(String(255), nullable=True, comment="Описание базы данных")
    name = Column(String(255), nullable=False, index=True, comment="Название подключения")
    database_type = Column(
        Enum(*[t[0] for t in DATABASE_TYPES], name="database_type_enum"),
        nullable=False,
        comment="Тип базы данных",
    )
    environment = Column(
        Enum(*[e[0] for e in ENVIRONMENT_CHOICES], name="environment_enum"),
        nullable=False,
        comment="Окружение",
    )
    is_favorite = Column(Boolean, default=False, nullable=False, comment="Избранное")
    owner_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        comment="ID владельца (пользователя)",
    )
    db_user = relationship(
        "DB_User",
        back_populates="connection",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    owner = relationship("User", back_populates="db_connection")
    __table_args__ = (
        UniqueConstraint(
            "database_name",
            "host",
            "port",
            "username",
            "name",
            "owner_id",
            name="uq_connection_unique_fields",
        ),
        Index("idx_connection_database_name_search", "database_name"),
        Index("idx_connection_database_type_search", "database_type"),
        Index("idx_connection_environment_search", "environment"),
        Index("idx_connection_is_favorite", "is_favorite"),
        Index("idx_connection_owner_id", "owner_id"),
        Index("idx_connection_created_at", "created_at"),
        Index("idx_connection_updated_at", "updated_at"),
    )

    def __repr__(self):
        return f"<DB_Connection(id={self.id}, name='{self.name}', type='{self.database_type}', owner_id={self.owner_id})>"


class DB_User(Base, DateTimeMixin):
    __tablename__ = "db_user"
    id = Column(Integer, primary_key=True, index=True, comment="PK группы/пользователя")
    oid = Column(Integer, nullable=False, index=True, comment="OID группы/пользователя")
    name = Column(String(255), nullable=False, index=True, comment="Название группы/пользователя")
    description = Column(Text, nullable=True, comment="Описание группы/пользователя")
    email = Column(String(200), nullable=True, index=True, comment="Почта пользователя")
    connection_id = Column(
        Integer,
        ForeignKey("db_connection.id", ondelete="CASCADE"),
        nullable=False,
        comment="ID подключения к БД",
    )
    connection = relationship("DB_Connection", back_populates="db_user")
    __table_args__ = (
        UniqueConstraint("connection_id", "oid", "name", name="uq_db_user_connection_name"),
        Index("idx_db_name", "name"),
    )

    def __repr__(self):
        return f"<DB_User(id={self.id}, name='{self.name}', connection_id={self.connection_id})>"
