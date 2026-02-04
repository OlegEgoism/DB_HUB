# backend/models/app_agreements.py

from sqlalchemy import Boolean, Column, Integer, String, Text

from backend.database.session import Base


class Documentation(Base):
    __tablename__ = "documentation"
    id = Column(Integer, primary_key=True, index=True, comment="PK документации")
    number = Column(String(50), unique=True, nullable=False, index=True, comment="Порядковый номер")
    title = Column(String(100), unique=True, nullable=False, comment="Заголовок")
    content = Column(Text, nullable=False, comment="Описание")
    is_active = Column(Boolean, default=False, nullable=False, comment="Активность")

    def __repr__(self):
        return f"<Documentation(id={self.id}, number='{self.number}', title='{self.title[:30]}...')>"
