# backend/api/v1/db_groups.py
from fastapi import APIRouter, Depends, HTTPException, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from backend.database.session import get_db
from backend.schemas.db_groups_schemas import PaginatedDBGroupsResponse, DBGroupUpdate, DBGroupCreate, DBGroupOut
from backend.services.db_groups_services import DBGroupService

router = APIRouter(prefix="/db_connections/{connection_id}/groups", tags=["DB GROUPS"])


@router.get("/", response_model=PaginatedDBGroupsResponse)
async def list_groups(
        connection_id: int,
        db: AsyncSession = Depends(get_db),
        page: int = Query(1, ge=1, description="Номер страницы, начиная с 1"),
        size: int = Query(20, ge=1, le=200, description="Количество записей на странице (1–200)"),
        search: Optional[str] = Query(None, description="Поиск по названию группы")
):
    """Получить список групп в базе данных"""
    try:
        service = DBGroupService(db)
        return await service.list_groups(connection_id=connection_id, page=page, size=size, search=search)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при получении списка групп: {str(e)}")


@router.get("/{oid}", response_model=DBGroupOut)
async def get_group(
        connection_id: int = Path(..., description="id подключения к базе данных"),
        oid: int = Path(..., description="oid группы в базе данных"),
        db: AsyncSession = Depends(get_db)
):
    """Получить информацию о группе в базе данных"""
    try:
        service = DBGroupService(db)
        group_data = await service.get_group(connection_id, oid)
        return group_data
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при получении группы: {str(e)}")


@router.put("/{oid}", response_model=dict)
async def update_group(
        update: DBGroupUpdate,
        connection_id: int = Path(..., description="id подключения к базе данных"),
        oid: int = Path(..., description="oid группы в базе данных"),
        db: AsyncSession = Depends(get_db)
):
    """Обновить данные группу в базе данных"""
    try:
        service = DBGroupService(db)
        result = await service.update_group(connection_id, oid, update)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при обновлении группы: {str(e)}")


@router.post("/", response_model=dict, status_code=201)
async def create_group(
        create: DBGroupCreate,
        connection_id: int = Path(..., description="id подключения к базе данных"),
        db: AsyncSession = Depends(get_db)
):
    """Создать новую группу в базе данных"""
    try:
        service = DBGroupService(db)
        result = await service.create_group(connection_id, create)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при создании группы: {str(e)}")


@router.delete("/{oid}", status_code=200)
async def delete_group(
        connection_id: int = Path(..., description="id подключения к базе данных"),
        oid: int = Path(..., description="oid группы в базе данных"),
        db: AsyncSession = Depends(get_db)
):
    """Удалить группу из базы данных"""
    try:
        service = DBGroupService(db)
        result = await service.delete_group(connection_id, oid)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при удалении группы: {str(e)}")
