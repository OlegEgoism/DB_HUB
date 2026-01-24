# backend/api/v1/app_agreements.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.session import get_db
from backend.models.agreement import Agreement
from backend.schemas.app_agreements_schemas import AgreementResponse

router = APIRouter(prefix="/app_agreements", tags=["APP AGREEMENTS"])


@router.get("", response_model=list[AgreementResponse])
async def get_all_agreements(db: AsyncSession = Depends(get_db), is_active: bool = None):
    """Получить список всех пользовательских соглашений"""
    try:
        query = select(Agreement)
        if is_active is not None:
            query = query.where(Agreement.is_active == is_active)
        result = await db.execute(query)
        agreements = result.scalars().all()
        return agreements
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при получении списка соглашений: {str(e)}",
        ) from e
