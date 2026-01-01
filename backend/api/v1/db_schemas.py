# backend/api/v1/db_schemas.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from backend.database.session import get_db
from backend.services.db_schema_service import DBSchemaService
from backend.schemas.db_schema_schemas import PaginatedDBSchemasResponse

router = APIRouter(prefix="/db_schemas", tags=["DB SCHEMAS"])


@router.get("/connection/{connection_id}/statistics", response_model=PaginatedDBSchemasResponse)
async def get_schema_statistics(
        connection_id: int,
        db: AsyncSession = Depends(get_db),
        search: Optional[str] = Query(None, description="Поиск по имени схемы, владельцу или описанию"),
        page: int = Query(1, ge=1, description="Номер страницы, начиная с 1"),
        size: int = Query(20, ge=1, le=200, description="Количество записей на странице (1–200)"),
        sort_by: str = Query("name", description="Поле для сортировки (name, owner, size_bytes, table_count)"),
        sort_order: str = Query("asc", description="Порядок сортировки (asc или desc)")
):
    """Получить статистику по схемам из внешней БД."""
    try:
        service = DBSchemaService(db)
        result = await service.get_schemas_with_statistics(
            connection_id=connection_id,
            search=search,
            page=page,
            size=size,
            sort_by=sort_by,
            sort_order=sort_order
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при получении статистики по схемам: {str(e)}")
