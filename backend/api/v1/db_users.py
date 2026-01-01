# backend/api/v1/db_users.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
import math
from typing import Optional

from backend.database.session import get_db
from backend.models import DB_User, DB_Connection
from backend.services.db_user_service import DBUserService
from backend.schemas.db_user_schemas import DBUsersResponse, DBUserCreateRequest, DBUserUpdateRequest, AddRemoveUserToGroupRequest

router = APIRouter(prefix="/db_users", tags=["DB USERS"])


@router.get("/connection/{connection_id}", response_model=DBUsersResponse)
async def get_users_by_connection(
        connection_id: int,
        db: AsyncSession = Depends(get_db),
        page: int = Query(1, ge=1, description="Номер страницы, начиная с 1"),
        size: int = Query(20, ge=1, le=200, description="Количество записей на странице (1–200)"),
        search: Optional[str] = Query(None, description="Поиск по username, description или email"),
        sort_by: str = Query("username", description="Поле для сортировки (username, created_at, updated_at, oid)"),
        sort_order: str = Query("asc", description="Порядок сортировки (asc или desc)")
):
    """Получить список пользователей из внешней БД с автоматической синхронизацией, пагинацией, поиском и сортировкой."""
    try:
        service = DBUserService(db)
        sync_result = await service.smart_sync_users_for_connection(connection_id)
        connection_result = await db.execute(select(DB_Connection).where(DB_Connection.id == connection_id))
        connection = connection_result.scalar_one_or_none()
        if not connection:
            raise ValueError(f"Подключение с ID {connection_id} не найдено")
        query = select(DB_User).where(DB_User.connection_id == connection_id)
        filters = []
        if search and search.strip():
            search_term = f"%{search.strip().lower()}%"
            filters = [
                or_(
                    func.lower(DB_User.username).contains(search_term),
                    func.lower(DB_User.description).contains(search_term) if DB_User.description is not None else False,
                    func.lower(DB_User.email).contains(search_term) if DB_User.email is not None else False
                )
            ]
            query = query.where(or_(*filters))
        total_count_query = select(func.count(DB_User.id)).where(DB_User.connection_id == connection_id)
        total_result = await db.execute(total_count_query)
        total_users = total_result.scalar_one()
        if filters:
            filtered_count_query = select(func.count(DB_User.id)).where(DB_User.connection_id == connection_id, or_(*filters))
            filtered_result = await db.execute(filtered_count_query)
            total_filtered = filtered_result.scalar_one()
        else:
            total_filtered = total_users
        valid_sort_fields = ["username", "created_at", "updated_at", "oid", "id"]
        valid_sort_orders = ["asc", "desc"]
        if sort_by not in valid_sort_fields:
            sort_by = "username"
        sort_order = sort_order.lower()
        if sort_order not in valid_sort_orders:
            sort_order = "asc"
        sort_column = getattr(DB_User, sort_by, DB_User.username)
        if sort_order == "desc":
            query = query.order_by(sort_column.desc())
        else:
            query = query.order_by(sort_column.asc())
        skip = (page - 1) * size
        query = query.offset(skip).limit(size)
        result = await db.execute(query)
        filtered_users = result.scalars().all()
        external_users = await service._fetch_users_from_external_db(connection)
        external_by_oid = {u["oid"]: u for u in external_users}
        user_list = []
        for u in filtered_users:
            ext = external_by_oid.get(u.oid)
            user_list.append({
                "id": u.id,
                "oid": u.oid,
                "username": u.username,
                "description": u.description,
                "email": u.email,
                "created_at": u.created_at,
                "updated_at": u.updated_at,
                "rolsuper": ext["rolsuper"] if ext else False
            })
        pages = math.ceil(total_filtered / size) if size > 0 and total_filtered > 0 else 1
        has_next = page < pages
        has_prev = page > 1
        return DBUsersResponse(
            connection_id=connection_id,
            connection_name=connection.name,
            total_users=total_users,
            total_filtered_users=total_filtered,
            page=page,
            size=size,
            pages=pages,
            has_next=has_next,
            has_prev=has_prev,
            users=user_list
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при получении пользователей: {str(e)}")


@router.post("/connection/{connection_id}", response_model=dict)
async def create_db_user(connection_id: int, user_data: DBUserCreateRequest, db: AsyncSession = Depends(get_db)):
    """Создать пользователя (роль) во внешней БД"""
    try:
        service = DBUserService(db)
        result = await service.create_user_in_external_db(
            connection_id=connection_id,
            username=user_data.username,
            password=user_data.password,
            description=user_data.description,
            email=user_data.email,
            rolsuper=user_data.rolsuper,
            rolinherit=user_data.rolinherit,
            rolcreaterole=user_data.rolcreaterole,
            rolcreatedb=user_data.rolcreatedb,
            rolcanlogin=user_data.rolcanlogin,
            rolreplication=user_data.rolreplication,
            rolconnlimit=user_data.rolconnlimit,
            rolvaliduntil=user_data.rolvaliduntil
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при создании пользователя: {str(e)}")


@router.patch("/{user_id}", response_model=dict)
async def update_db_user(user_id: int, user_data: DBUserUpdateRequest, db: AsyncSession = Depends(get_db)):
    """Обновление пользователя (роль) во внешней БД"""
    try:
        service = DBUserService(db)
        result = await service.update_user_in_external_db(
            user_id=user_id,
            username=user_data.username,
            password=user_data.password,
            description=user_data.description,
            email=user_data.email,
            rolsuper=user_data.rolsuper,
            rolinherit=user_data.rolinherit,
            rolcreaterole=user_data.rolcreaterole,
            rolcreatedb=user_data.rolcreatedb,
            rolcanlogin=user_data.rolcanlogin,
            rolreplication=user_data.rolreplication,
            rolconnlimit=user_data.rolconnlimit,
            rolvaliduntil=user_data.rolvaliduntil
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при обновлении роли: {str(e)}")


@router.delete("/{user_id}", status_code=status.HTTP_200_OK, response_model=dict)
async def delete_db_user(user_id: int, db: AsyncSession = Depends(get_db)):
    """Удаляет пользователя (роль) из внешней БД и удаляет запись из локальной БД"""
    try:
        service = DBUserService(db)
        result = await service.delete_user_in_external_db(user_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при удалении пользователя: {str(e)}")


@router.post("/add-to-group", response_model=dict, status_code=status.HTTP_200_OK)
async def add_user_to_group_endpoint(request: AddRemoveUserToGroupRequest, db: AsyncSession = Depends(get_db)):
    """Добавить пользователя в группу во внешней БД"""
    try:
        service = DBUserService(db)
        result = await service.add_user_to_group(user_id=request.user_id, group_id=request.group_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при добавлении в группу: {str(e)}")


@router.post("/remove-from-group", response_model=dict, status_code=status.HTTP_200_OK)
async def remove_user_from_group_endpoint(request: AddRemoveUserToGroupRequest, db: AsyncSession = Depends(get_db)):
    """Удалить пользователя (роль) из группы во внешней БД"""
    try:
        service = DBUserService(db)
        result = await service.remove_user_from_group(user_id=request.user_id, group_id=request.group_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при удалении из группы: {str(e)}")
