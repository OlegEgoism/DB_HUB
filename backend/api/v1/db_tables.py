# backend/api/v1/db_tables.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from backend.database.session import get_db
from backend.services.db_table_service import DBTableService
from backend.schemas.db_table_schemas import PaginatedDBTablesResponse

router = APIRouter(prefix="/db_tables", tags=["DB TABLES"])


@router.get("/connection/{connection_id}/schema/{schema_oid}", response_model=PaginatedDBTablesResponse)
async def get_tables_in_schema(
        connection_id: int,
        schema_oid: int,
        db: AsyncSession = Depends(get_db),
        page: int = Query(1, ge=1, description="Номер страницы"),
        size: int = Query(20, ge=1, le=200, description="Количество записей на странице"),
        search: Optional[str] = Query(None, description="Поиск по имени таблицы или описанию"),
        sort_by: str = Query("table_name", description="Поле для сортировки"),
        sort_order: str = Query("asc", description="Порядок сортировки (asc/desc)")
):
    """Получить список таблиц (и представлений) из указанной схемы внешней БД."""
    try:
        service = DBTableService(db)
        result = await service.get_tables_in_schema(
            connection_id=connection_id,
            schema_oid=schema_oid,
            page=page,
            size=size,
            search=search,
            sort_by=sort_by,
            sort_order=sort_order
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при получении таблиц: {str(e)}")
