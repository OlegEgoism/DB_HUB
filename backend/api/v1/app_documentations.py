# backend/api/v1/app_documentations.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.session import get_db
from backend.models.documentations import Documentation
from backend.schemas.app_documentations_schemas import DocumentationResponse

router = APIRouter(prefix="/app_documentations", tags=["APP DOCUMENTATIONS"])


@router.get("", response_model=list[DocumentationResponse])
async def get_all_documentations(db: AsyncSession = Depends(get_db), is_active: bool = None):
    """Получить список всех документаций"""
    try:
        query = select(Documentation)
        if is_active is not None:
            query = query.where(Documentation.is_active == is_active)
        result = await db.execute(query)
        documentations = result.scalars().all()
        return documentations
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при получении списка документаций: {str(e)}",
        ) from e
