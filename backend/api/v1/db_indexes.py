# backend/api/v1/db_indexes.py

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.session import get_db
from backend.schemas.db_indexes_schemas import PaginatedIndexesResponse
from backend.services.db_indexes_services import DBIndexesService

router = APIRouter(prefix="/db_connections/{connection_id}/indexes", tags=["DB INDEXES"])


@router.get("", response_model=PaginatedIndexesResponse, summary="Получить список индексов", description="Возвращает пагинированный список индексов в базе данных")
async def get_indexes(
    connection_id: int,
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1, description="Номер страницы, начиная с 1"),
    size: int = Query(20, ge=1, le=200, description="Количество записей на странице (1–200)"),
    search: str = Query(None, description="Поиск по схеме, таблице, названию индекса"),
):
    """Получить список индексов"""
    try:
        service = DBIndexesService(db)
        result = await service.get_indexes(connection_id=connection_id, page=page, size=size, search=search)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при получении индексов: {str(e)}",
        ) from e
