# backend/models/app_agreements.py
from sqlalchemy import Boolean, Column, Integer, String, Text

from backend.database.session import Base


class Agreement(Base):
    __tablename__ = "agreement"

    id = Column(Integer, primary_key=True, index=True, comment="PK пользовательского соглашения")
    number = Column(String(50), unique=True, nullable=False, index=True, comment="Порядковый номер")
    title = Column(String(100), unique=True, nullable=False, comment="Заголовок")
    content = Column(Text, nullable=False, comment="Описание")
    is_active = Column(Boolean, default=False, nullable=False, comment="Активность")

    def __repr__(self):
        return f"<Agreement(id={self.id}, number='{self.number}', title='{self.title[:30]}...')>"
