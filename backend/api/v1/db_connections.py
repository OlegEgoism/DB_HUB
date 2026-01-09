# backend/api/v1/db_connections.py
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, func
import asyncpg
from backend.database.session import get_db
from backend.models.db import DB_Connection
from backend.models.user import User
from backend.core.security import encrypt_password, decrypt_password
from backend.schemas.db_connections_schemas import (
    ConnectionCreate,
    ConnectionOut,
    ConnectionUpdate,
    PaginatedConnectionResponse,
    PaginatedActiveConnectionsResponse,
    TerminateConnectionRequest, ConnectionFavoriteUpdate
)
from backend.services.db_connections_services import DBConnectionService

router = APIRouter(prefix="/db_connections", tags=["DB CONNECTION"])


async def get_db_status_and_size(connection: DB_Connection) -> tuple[str, float | None]:
    """Размер базы данных"""
    try:
        password = decrypt_password(connection.password)
        conn = await asyncpg.connect(
            host=connection.host,
            port=connection.port,
            user=connection.username,
            password=password,
            database=connection.database_name,
            timeout=5
        )
        size_bytes = await conn.fetchval("SELECT pg_database_size(current_database())")
        await conn.close()
        return "connected", round(size_bytes / 1024 / 1024, 2)
    except Exception:
        return "error", None


@router.get("/", response_model=PaginatedConnectionResponse)
async def list_connections(
        db: AsyncSession = Depends(get_db),
        page: int = Query(1, ge=1, description="Номер страницы, начиная с 1"),
        size: int = Query(20, ge=1, le=200, description="Количество записей на странице (1–200)"),
        search: Optional[str] = Query(None, description="""Поиск по нескольким полям одновременно"""),
        database_type: Optional[str] = Query(None, description="Фильтр по типу СУБД (например: postgresql)"),
        environment: Optional[str] = Query(None, description="Фильтр по окружению (production, development, testing, analytics)"),
        is_favorite: Optional[bool] = Query(None, description="Фильтр по избранному (true/false)"),
        sort_by: str = Query("name", description="Поле для сортировки (name, created_at, updated_at, database_name)"),
        sort_order: str = Query("asc", description="Порядок сортировки (asc или desc)")
):
    """Получить список подключений к базам данных с поддержкой поиска, фильтрации и сортировки."""
    try:
        query = select(DB_Connection, User.username.label("owner_username")).join(User, DB_Connection.owner_id == User.id)
        filters = []
        if search and search.strip():
            search_term = f"%{search.strip()}%"
            filters.append(
                or_(
                    DB_Connection.database_name.ilike(search_term),
                    DB_Connection.name.ilike(search_term),
                    DB_Connection.description.ilike(search_term),
                )
            )
        if database_type:
            filters.append(DB_Connection.database_type == database_type)
        if environment:
            filters.append(DB_Connection.environment == environment)
        if is_favorite is not None:
            filters.append(DB_Connection.is_favorite == is_favorite)
        if filters:
            query = query.where(and_(*filters))
        count_query = query.with_only_columns(func.count(DB_Connection.id))
        total_result = await db.execute(count_query)
        total = total_result.scalar_one()
        valid_sort_fields = ["name", "created_at", "updated_at", "database_name", "environment", "database_type"]
        valid_sort_orders = ["asc", "desc"]
        if sort_by not in valid_sort_fields:
            sort_by = "name"
        sort_order = sort_order.lower()
        if sort_order not in valid_sort_orders:
            sort_order = "asc"
        sort_column = getattr(DB_Connection, sort_by, DB_Connection.name)
        if sort_order == "desc":
            query = query.order_by(sort_column.desc())
        else:
            query = query.order_by(sort_column.asc())
        skip = (page - 1) * size
        query = query.offset(skip).limit(size)
        result = await db.execute(query)
        rows = result.all()
        items = []
        for row in rows:
            connection, owner_username = row
            status_conn, size_mb = await get_db_status_and_size(connection)
            connection_dict = {**connection.__dict__, "status": status_conn, "db_size_mb": size_mb, "owner_username": owner_username}
            items.append(ConnectionOut(**connection_dict))
        pages = (total + size - 1) // size if size > 0 else 1
        has_next = page < pages
        has_prev = page > 1
        return PaginatedConnectionResponse(
            items=items,
            total=total,
            page=page,
            size=size,
            pages=pages,
            has_next=has_next,
            has_prev=has_prev
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при получении списка подключений: {str(e)}")


@router.get("/{connection_id}", response_model=ConnectionOut)
async def read_connection(connection_id: int, db: AsyncSession = Depends(get_db)):
    """Получить подключение по ID с именем владельца"""
    result = await db.execute(select(DB_Connection, User.username.label("owner_username")).join(User, DB_Connection.owner_id == User.id).where(DB_Connection.id == connection_id))
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Подключение не найдено")
    connection, owner_username = row
    status_conn, size = await get_db_status_and_size(connection)
    connection_dict = {**connection.__dict__, "status": status_conn, "db_size_mb": size, "owner_username": owner_username}
    return ConnectionOut(**connection_dict)


@router.post("/", response_model=ConnectionOut, status_code=status.HTTP_201_CREATED)
async def create_connection_endpoint(connection: ConnectionCreate, db: AsyncSession = Depends(get_db)):
    """Создать новое подключение"""
    result = await db.execute(select(User).where(User.id == connection.owner_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Владелец не найден")
    encrypted_password = encrypt_password(connection.password)
    db_connection = DB_Connection(**connection.model_dump(exclude={"password"}), password=encrypted_password)
    db.add(db_connection)
    await db.commit()
    await db.refresh(db_connection)
    result = await db.execute(select(User.username).where(User.id == db_connection.owner_id))
    owner_username = result.scalar_one()
    status_conn, size = await get_db_status_and_size(db_connection)
    connection_dict = {**db_connection.__dict__, "status": status_conn, "db_size_mb": size, "owner_username": owner_username}
    return ConnectionOut(**connection_dict)


@router.put("/{connection_id}", response_model=ConnectionOut)
async def update_connection_endpoint(connection_id: int, connection: ConnectionUpdate, db: AsyncSession = Depends(get_db)):
    """Обновить существующее подключение"""
    result = await db.execute(select(DB_Connection).where(DB_Connection.id == connection_id))
    db_connection = result.scalar_one_or_none()
    if not db_connection:
        raise HTTPException(status_code=404, detail="Подключение не найдено")
    update_data = connection.model_dump(exclude_unset=True)
    if "password" in update_data:
        update_data["password"] = encrypt_password(update_data["password"])
    for field, value in update_data.items():
        setattr(db_connection, field, value)
    await db.commit()
    await db.refresh(db_connection)
    result = await db.execute(select(User.username).where(User.id == db_connection.owner_id))
    owner_username = result.scalar_one()
    status_conn, size = await get_db_status_and_size(db_connection)
    connection_dict = {**db_connection.__dict__, "status": status_conn, "db_size_mb": size, "owner_username": owner_username}
    return ConnectionOut(**connection_dict)


@router.delete("/{connection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_connection_endpoint(connection_id: int, db: AsyncSession = Depends(get_db)):
    """Удалить подключение"""
    result = await db.execute(select(DB_Connection).where(DB_Connection.id == connection_id))
    db_connection = result.scalar_one_or_none()
    if not db_connection:
        raise HTTPException(status_code=404, detail="Подключение не найдено")
    await db.delete(db_connection)
    await db.commit()


@router.get("/{connection_id}/active-connections", response_model=PaginatedActiveConnectionsResponse)
async def get_active_connections(
        connection_id: int,
        db: AsyncSession = Depends(get_db),
        page: int = Query(1, ge=1, description="Номер страницы, начиная с 1"),
        size: int = Query(20, ge=1, le=200, description="Количество записей на странице (1–200)"),
        username: Optional[str] = Query(
            None,
            description="Фильтр по имени пользователя (регистронезависимый поиск)"
        )
):
    """Получить список активных подключений к внешней БД с пагинацией и фильтрацией"""
    try:
        service = DBConnectionService(db)
        result = await service.get_active_connections(connection_id=connection_id, page=page, size=size, username=username)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при получении активных подключений: {str(e)}")


@router.post("/{connection_id}/active-connections/terminate", response_model=dict)
async def terminate_active_connection(connection_id: int, request: TerminateConnectionRequest, db: AsyncSession = Depends(get_db)):
    """Завершить активное подключение (процесс) во внешней БД по PID"""
    try:
        service = DBConnectionService(db)
        result = await service.terminate_backend_process(connection_id, request.pid)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при завершении процесса: {str(e)}")


@router.patch("/{connection_id}/favorite", response_model=ConnectionOut)
async def update_connection_favorite(connection_id: int, favorite_update: ConnectionFavoriteUpdate, db: AsyncSession = Depends(get_db)):
    """Обновить только флаг 'избранное' для подключения."""
    result = await db.execute(select(DB_Connection).where(DB_Connection.id == connection_id))
    db_connection = result.scalar_one_or_none()
    if not db_connection:
        raise HTTPException(status_code=404, detail="Подключение не найдено")
    db_connection.is_favorite = favorite_update.is_favorite
    await db.commit()
    await db.refresh(db_connection)
    owner_result = await db.execute(select(User.username).where(User.id == db_connection.owner_id))
    owner_username = owner_result.scalar_one()
    status_conn, size = await get_db_status_and_size(db_connection)
    connection_dict = {
        **db_connection.__dict__,
        "status": status_conn,
        "db_size_mb": size,
        "owner_username": owner_username
    }
    return ConnectionOut(**connection_dict)
