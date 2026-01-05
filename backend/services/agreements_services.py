# backend/services/agreements_services.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.models.agreement import Agreement
from typing import List, Optional


class AgreementService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all_agreements(self, is_active: Optional[bool] = None) -> List[Agreement]:
        """Получить все соглашения с опциональной фильтрацией по активности"""
        query = select(Agreement)
        if is_active is not None:
            query = query.where(Agreement.is_active == is_active)
        query = query.order_by(Agreement.number)
        result = await self.db.execute(query)
        return result.scalars().all()
