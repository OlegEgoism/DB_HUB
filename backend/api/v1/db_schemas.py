# backend/api/v1/db_schemas.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from backend.database.session import get_db
from backend.services.db_schema_service import DBSchemaService
from backend.schemas.db_schema_schemas import PaginatedSchemasWithTablesResponse, PaginatedTemporaryTablesResponse

router = APIRouter(prefix="/db_schemas", tags=["DB SCHEMAS"])


@router.get("/connection/{connection_id}/tables", response_model=PaginatedSchemasWithTablesResponse)
async def get_schemas_with_physical_tables(
        connection_id: int,
        db: AsyncSession = Depends(get_db),
        page: int = Query(1, ge=1, description="Номер страницы"),
        size: int = Query(20, ge=1, le=200, description="Количество схем на странице"),
        search: str = Query(None, description="Поиск по: имени/описанию схемы, имени/описанию таблицы"),
):
    """Получить список схем и физических таблиц."""
    try:
        service = DBSchemaService(db)
        result = await service.get_schemas_with_tables(connection_id=connection_id, page=page, size=size, search=search)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при получении схем и таблиц: {str(e)}")


@router.get("/connection/{connection_id}/temporary_tables", response_model=PaginatedTemporaryTablesResponse)
async def get_temporary_tables(
        connection_id: int,
        db: AsyncSession = Depends(get_db),
        page: int = Query(1, ge=1, description="Номер страницы"),
        size: int = Query(20, ge=1, le=200, description="Количество таблиц на странице"),
        search: str = Query(None, description="Поиск по имени или описанию временной таблицы"), ):
    """Получить список временных таблиц в текущей сессии подключения."""
    try:
        service = DBSchemaService(db)
        result = await service.get_temporary_tables(connection_id=connection_id, page=page, size=size, search=search)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при получении временных таблиц: {str(e)}")
