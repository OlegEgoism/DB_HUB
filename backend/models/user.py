# backend/models/user.py
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    Index,
    Integer,
    String,
    event,
    func,
)
from sqlalchemy.orm import relationship

from backend.database.session import Base
from backend.models.base_mixin import DateTimeMixin

ROLE_CHOICES = [
    "Администратор БД",
    "Аналитик",
    "Разработчик",
    "Тестировщик",
    "Пользователь",
]

role_check = "role IN ({})".format(", ".join(repr(r) for r in ROLE_CHOICES))


class User(Base, DateTimeMixin):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True, comment="PK пользователя")
    username = Column(String, unique=True, index=True, comment="Логин пользователя")
    email = Column(String, unique=True, index=True, nullable=False, comment="Почта пользователя")
    hashed_password = Column(String, nullable=False, comment="Хешированный пароль пользователя")
    fio = Column(String, nullable=True, comment="ФИО пользователя")
    is_active = Column(Boolean, default=True, nullable=False, comment="Активность пользователя")
    is_superuser = Column(Boolean, default=False, nullable=False, comment="Полный доступ пользователя")
    role = Column(
        String,
        nullable=False,
        default="Пользователь",
        comment="Роль пользователя в системе",
    )
    last_login = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Дата и время последнего входа пользователя в систему",
    )
    refresh_token = Column(String, nullable=True, comment="Refresh токен")
    __table_args__ = (
        CheckConstraint(role_check, name="valid_role"),
        Index("idx_users_username_search", "username"),
        Index("idx_users_email_search", "email"),
        Index("idx_users_fio_search", "fio"),
        Index("idx_users_is_active_search", "is_active"),
        Index("idx_users_is_superuser_search", "is_superuser"),
        Index("idx_users_role_search", "role"),
    )
    connection_tab_settings = relationship(
        "ConnectionTabSettings",
        back_populates="user",
        cascade="all, delete-orphan",
        uselist=False,
        lazy="selectin",
    )

    db_connection = relationship(
        "DB_Connection",
        back_populates="owner",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}', role='{self.role}')>"


@event.listens_for(User, "before_update")
def receive_before_update(mapper, connection, target):
    """Обновляем updated_at только если изменились поля, кроме last_login"""
    state = target._sa_instance_state
    changed_columns = []
    for attr in state.mapper.column_attrs:
        hist = state.get_history(attr.key, True)
        if hist.has_changes():
            changed_columns.append(attr.key)
    if changed_columns == ["last_login"]:
        return
    target.updated_at = func.now()
