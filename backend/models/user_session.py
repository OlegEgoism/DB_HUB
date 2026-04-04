from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship

from backend.database.session import Base


class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, index=True, comment="PK сессии пользователя")
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True, comment="ID пользователя-владельца сессии")
    token_jti = Column(String, unique=True, nullable=False, index=True, comment="Уникальный JTI access-токена")
    is_active = Column(Boolean, nullable=False, default=True, index=True, comment="Признак активности сессии")
    ip_address = Column(String, nullable=True, comment="IP-адрес, с которого выполнен вход")
    user_agent = Column(String, nullable=True, comment="User-Agent клиента")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), comment="Дата и время создания сессии")
    last_seen_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), comment="Дата и время последней активности сессии")
    expires_at = Column(DateTime(timezone=True), nullable=False, comment="Дата и время истечения сессии")
    revoked_at = Column(DateTime(timezone=True), nullable=True, comment="Дата и время отзыва сессии")
    revoked_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, comment="ID пользователя, отозвавшего сессию")

    user = relationship("User", foreign_keys=[user_id], back_populates="sessions")
    revoked_by = relationship("User", foreign_keys=[revoked_by_user_id])
