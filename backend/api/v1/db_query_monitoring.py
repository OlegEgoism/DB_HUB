# backend/api/v1/db_query_monitoring.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from backend.database.session import get_db
from backend.services.db_query_monitoring_service import DBQueryMonitoringService
from backend.schemas.db_query_monitoring_schemas import PaginatedSlowQueriesResponse

router = APIRouter(prefix="/db_connections/{connection_id}", tags=["DB QUERY MONITORING"])


@router.get("/slow_queries", response_model=PaginatedSlowQueriesResponse)
async def get_slow_queries(
    connection_id: int,
    db: AsyncSession = Depends(get_db),
    min_duration_ms: int = Query(1000, ge=0, description="Минимальная длительность запроса в миллисекундах"),
    page: int = Query(1, ge=1, description="Номер страницы, начиная с 1"),
    size: int = Query(20, ge=1, le=200, description="Количество записей на странице (1–200)"),
    search: str = Query(None, description="Поиск по тексту запроса, имени пользователя или приложению"),
):
    """Получить список медленных (долгих) активных запросов без pg_stat_statements"""
    try:
        service = DBQueryMonitoringService(db)
        return await service.get_slow_queries(
            connection_id=connection_id,
            min_duration_ms=min_duration_ms,
            page=page,
            size=size,
            search=search,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при получении медленных запросов: {str(e)}")