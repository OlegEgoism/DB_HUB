# backend/api/v1/db_users.py
from fastapi import APIRouter, Depends, HTTPException, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from backend.database.session import get_db
from backend.schemas.db_users_schemas import PaginatedDBUsersResponse, DBUserOut
from backend.services.db_users_services import DBUserService

router = APIRouter(prefix="/db_connections/{connection_id}/users", tags=["DB USERS"])


@router.get("/", response_model=PaginatedDBUsersResponse)
async def list_users(
        connection_id: int,
        db: AsyncSession = Depends(get_db),
        page: int = Query(1, ge=1, description="Номер страницы, начиная с 1"),
        size: int = Query(20, ge=1, le=200, description="Количество записей на странице (1–200)"),
        search: Optional[str] = Query(None, description="Поиск по имени и описанию пользователя")
):
    """Получить список пользователей из базы данных"""
    try:
        service = DBUserService(db)
        return await service.list_users(connection_id=connection_id, page=page, size=size, search=search)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при получении списка пользователей: {str(e)}")


@router.get("/{oid}", response_model=DBUserOut)
async def get_user(connection_id: int = Path(...), oid: int = Path(...), db: AsyncSession = Depends(get_db)):
    """Получить информацию о пользователе из базы данных"""
    try:
        service = DBUserService(db)
        return await service.get_user(connection_id, oid)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при получении пользователя: {str(e)}")
