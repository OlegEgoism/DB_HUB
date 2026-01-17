# backend/api/v1/db_views.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from backend.database.session import get_db
from backend.schemas.db_views_schemas import PaginatedViewsResponse, PaginatedMaterializedViewsResponse
from backend.services.db_views_services import DBViewsService

router = APIRouter(prefix="/db_connections/{connection_id}/views", tags=["DB VIEWS"])


@router.get("", response_model=PaginatedViewsResponse)
async def get_views(
        connection_id: int,
        db: AsyncSession = Depends(get_db),
        page: int = Query(1, ge=1, description="Номер страницы, начиная с 1"),
        size: int = Query(20, ge=1, le=200, description="Количество записей на странице (1–200)"),
        search: str = Query(None, description="Поиск по схеме, названию/описанию представления"),
):
    """Получить список представлений"""
    try:
        service = DBViewsService(db)
        result = await service.get_views(connection_id=connection_id, page=page, size=size, search=search)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при получении представлений: {str(e)}")


@router.get("/materialized", response_model=PaginatedMaterializedViewsResponse)
async def get_materialized_views(
        connection_id: int,
        db: AsyncSession = Depends(get_db),
        page: int = Query(1, ge=1, description="Номер страницы, начиная с 1"),
        size: int = Query(20, ge=1, le=200, description="Количество записей на странице (1–200)"),
        search: str = Query(None, description="Поиск по схеме, названию/описанию материализованного представления"),
):
    """Получить список материализованных представлений"""
    try:
        service = DBViewsService(db)
        result = await service.get_materialized_views(connection_id=connection_id, page=page, size=size, search=search)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при получении материализованных представлений: {str(e)}")
