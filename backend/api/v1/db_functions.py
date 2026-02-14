# backend/api/v1/db_functions.py

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.session import get_db
from backend.schemas.db_functions_schemas import PaginatedFunctionsResponse
from backend.services.db_functions_services import DBFunctionService

router = APIRouter(prefix="/db_connections/{connection_id}", tags=["DB FUNCTIONS"])


@router.get(
    "/functions",
    response_model=PaginatedFunctionsResponse,
    summary="Получить список функций",
    description="Возвращает пагинированный список функций в базе данных",
)
async def get_functions(
    connection_id: int,
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1, description="Номер страницы, начиная с 1"),
    size: int = Query(20, ge=1, le=200, description="Количество записей на странице (1–200)"),
    search: str = Query(None, description="Поиск по схеме, названию/описанию функции"),
):
    """Получить список функций"""
    try:
        service = DBFunctionService(db)
        return await service.get_functions(connection_id, page, size, search)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
