from sqlalchemy import JSON, Column, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import relationship

from backend.database.session import Base
from backend.models.base_mixin import DateTimeMixin


class ConnectionTabSettings(Base, DateTimeMixin):
    __tablename__ = "connection_tab_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    tabs_visibility = Column(JSON, nullable=False)

    user = relationship("User", back_populates="connection_tab_settings")

    __table_args__ = (
        UniqueConstraint("user_id", name="uq_connection_tab_settings_user_id"),
    )
