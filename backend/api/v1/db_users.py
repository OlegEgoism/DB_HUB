# backend/api/v1/db_users.py
from fastapi import APIRouter, Depends, HTTPException, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from backend.database.session import get_db
from backend.schemas.db_users_schemas import PaginatedDBUsersResponse, DBUserOut, DBUserCreate, DBUserUpdate, AddUserToGroupRequest, RemoveUserFromGroupRequest
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
async def get_user(
        connection_id: int = Path(..., description="id подключения к базе данных"),
        oid: int = Path(..., description="oid пользователя в базе данных"),
        db: AsyncSession = Depends(get_db)
):
    """Получить информацию о пользователе из базы данных"""
    try:
        service = DBUserService(db)
        return await service.get_user(connection_id, oid)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при получении пользователя: {str(e)}")


@router.post("/", response_model=DBUserOut, status_code=201)
async def create_user(
        user_data: DBUserCreate,
        connection_id: int = Path(..., description="id подключения к базе данных"),
        db: AsyncSession = Depends(get_db)
):
    """Создать нового пользователя в базе данных"""
    try:
        service = DBUserService(db)
        return await service.create_user(connection_id=connection_id, username=user_data.username, password=user_data.password, description=user_data.description, email=user_data.email)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при создании пользователя: {str(e)}")


@router.put("/{oid}", response_model=DBUserOut)
async def update_user(
        user_data: DBUserUpdate,
        connection_id: int = Path(..., description="id подключения к базе данных"),
        oid: int = Path(..., description="oid пользователя в базе данных"),
        db: AsyncSession = Depends(get_db)
):
    """Обновить данные пользователя в базе данных"""
    try:
        service = DBUserService(db)
        return await service.update_user(connection_id=connection_id, user_oid=oid, password=user_data.password, description=user_data.description, email=user_data.email)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при обновлении пользователя: {str(e)}")


@router.delete("/{oid}", status_code=204)
async def delete_user(
        connection_id: int = Path(..., description="id подключения к базе данных"),
        oid: int = Path(..., description="oid пользователя в базе данных"),
        db: AsyncSession = Depends(get_db)
):
    """Удалить пользователя из базы данных"""
    try:
        service = DBUserService(db)
        await service.delete_user(connection_id=connection_id, user_oid=oid)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при удалении пользователя: {str(e)}")


@router.get("/{oid}/groups", response_model=List[DBUserOut])
async def get_user_with_groups(
        connection_id: int = Path(..., description="id подключения к базе данных"),
        oid: int = Path(..., description="oid пользователя в базе данных"),
        db: AsyncSession = Depends(get_db)
):
    """Получить список групп, в которых состоит пользователь"""
    try:
        service = DBUserService(db)
        return await service.get_user_with_groups(connection_id=connection_id, user_oid=oid)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при получении членства пользователя: {str(e)}")


@router.post("/{group_oid}/add", status_code=200)
async def add_user_to_group(
        request: AddUserToGroupRequest,
        connection_id: int = Path(..., description="id подключения к базе данных"),
        group_oid: int = Path(..., description="oid группы в базе данных"),
        db: AsyncSession = Depends(get_db)
):
    """Добавить пользователя в группу"""
    try:
        service = DBUserService(db)
        result = await service.add_user_to_group(connection_id=connection_id, user_oid=request.user_oid, group_oid=group_oid)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при добавлении пользователя в группу: {str(e)}")


# backend/api/v1/db_users.py

@router.post("/{group_oid}/remove", status_code=200)
async def remove_user_from_group(
        request: RemoveUserFromGroupRequest,
        connection_id: int = Path(..., description="id подключения к базе данных"),
        group_oid: int = Path(..., description="oid группы в базе данных"),
        db: AsyncSession = Depends(get_db)
):
    """Удалить пользователя из группы"""
    try:
        service = DBUserService(db)
        result = await service.remove_user_from_group(connection_id=connection_id, user_oid=request.user_oid, group_oid=group_oid)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при удалении пользователя из группы: {str(e)}")
