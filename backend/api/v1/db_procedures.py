# backend/api/v1/db_procedures.py

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.session import get_db
from backend.schemas.db_procedures_schemas import PaginatedProceduresResponse
from backend.services.db_procedures_services import DBProcedureService

router = APIRouter(prefix="/db_connections/{connection_id}", tags=["DB PROCEDURES"])


@router.get("/procedures", response_model=PaginatedProceduresResponse)
async def get_procedures(
    connection_id: int,
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1, description="Номер страницы, начиная с 1"),
    size: int = Query(20, ge=1, le=200, description="Количество записей на странице (1–200)"),
    search: str = Query(None, description="Поиск по схеме названию/описанию и процедуре"),
):
    """Получить список процедур"""
    try:
        service = DBProcedureService(db)
        return await service.get_procedures(connection_id=connection_id, page=page, size=size, search=search)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при получении процедур: {str(e)}") from e
