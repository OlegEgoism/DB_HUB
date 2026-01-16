# backend/models/user.py
from sqlalchemy.orm import relationship
from sqlalchemy import Column, Integer, String, Boolean, DateTime, CheckConstraint, Index
from backend.database.session import Base
from backend.models.base_mixin import DateTimeMixin

ROLE_CHOICES = [
    "Администратор БД",
    "Аналитик",
    "Разработчик",
    "Тестировщик",
    "Пользователь"
]

role_check = "role IN ({})".format(", ".join(repr(r) for r in ROLE_CHOICES))


class User(Base, DateTimeMixin):
    __tablename__ = "users"
    # Основные поля
    id = Column(Integer, primary_key=True, index=True, comment="PK пользователя")
    username = Column(String, unique=True, index=True, comment="Логин пользователя")
    email = Column(String, unique=True, index=True, nullable=False, comment="Почта пользователя")
    hashed_password = Column(String, nullable=False, comment="Хешированный пароль пользователя")
    fio = Column(String, nullable=True, comment="ФИО пользователя")
    is_active = Column(Boolean, default=True, nullable=False, comment="Активность пользователя")
    is_superuser = Column(Boolean, default=False, nullable=False, comment="Полный доступ пользователя")
    role = Column(String, nullable=False, default="Пользователь", comment="Роль пользователя в системе")
    last_login = Column(DateTime(timezone=True), nullable=True, comment="Дата и время последнего входа пользователя в систему")
    refresh_token = Column(String, nullable=True, comment="Refresh токен")
    # Ограничения
    __table_args__ = (
        CheckConstraint(role_check, name="valid_role"),
        Index('idx_users_username_search', 'username'),
        Index('idx_users_email_search', 'email'),
        Index('idx_users_fio_search', 'fio'),
        Index('idx_users_is_active_search', 'is_active'),
        Index('idx_users_is_superuser_search', 'is_superuser'),
        Index('idx_users_role_search', 'role'),
    )
    # Связи
    db_connection = relationship("DB_Connection", back_populates="owner", cascade="all, delete-orphan", lazy="selectin")

    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}', role='{self.role}')>"