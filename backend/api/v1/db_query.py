# backend/api/v1/db_query.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.session import get_db
from backend.schemas.db_query_schemas import SQLQueryRequest, SQLQueryResponse
from backend.services.db_query_service import DBQueryService

router = APIRouter(prefix="/db_connections/{connection_id}", tags=["DB QUERY"])


@router.post("/query", response_model=SQLQueryResponse)
async def execute_sql_query(connection_id: int, request: SQLQueryRequest, db: AsyncSession = Depends(get_db)):
    """SQL-запрос (только SELECT). Поддерживается параметр `limit` (1–1000 строк)"""
    try:
        service = DBQueryService(db)
        result = await service.execute_query(connection_id=connection_id, query=request.query, limit=request.limit)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при выполнении запроса: {str(e)}",
        ) from e
