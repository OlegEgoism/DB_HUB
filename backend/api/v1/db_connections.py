# backend/api/v1/db_connections.py
from typing import Optional, Tuple
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, func
import asyncpg
from backend.database.session import get_db
from backend.models.db import DB_Connection
from backend.models.user import User
from backend.core.security import encrypt_password
from backend.schemas.db_connections_schemas import (
    ConnectionCreate,
    ConnectionUpdate,
    ConnectionOut,
    PaginatedConnectionResponse,
    PaginatedActiveConnectionsResponse,
    TerminateConnectionRequest,
    ConnectionFavoriteUpdate
)
from backend.services.db_connections_services import DBConnectionService
from backend.utils.external_db import external_db_connection


router = APIRouter(prefix="/db_connections", tags=["DB CONNECTION"])


async def get_db_info(db_connection: DB_Connection) -> Tuple[str, float | None, str | None, bool]:
    """Получить статус подключения, размер, описание и флаг успешности базы данных (status, size_mb, db_description, is_connected)"""
    try:
        async with external_db_connection(db_connection, timeout=5) as conn:
            size_bytes = await conn.fetchval("SELECT pg_database_size(current_database())")
            db_description_query = """
            SELECT 
                COALESCE(d.description, '') as description
            FROM pg_database db
            LEFT JOIN pg_shdescription d ON db.oid = d.objoid
            WHERE db.datname = current_database();
            """
            db_description_result = await conn.fetchrow(db_description_query)
            db_description = db_description_result['description'] if db_description_result and db_description_result['description'] else None
            return "connected", round(size_bytes / 1024 / 1024, 2), db_description, True
    except Exception:
        return "error", None, None, False


async def sync_description_if_needed(db: AsyncSession, connection: DB_Connection, external_description: Optional[str]) -> str:
    """Сравнивает локальное и внешнее описание в базе данных, если отличаются — обновляет локальное поле description в базе данных"""
    local_desc = connection.description or ""
    external_desc = external_description or ""
    if local_desc != external_desc:
        connection.description = external_description
        db.add(connection)
        await db.commit()
        await db.refresh(connection)
    return external_description if external_description is not None else connection.description


def build_connection_out(connection: DB_Connection, owner_username: str, status: str, db_size_mb: Optional[float], description: Optional[str]) -> ConnectionOut:
    """Вспомогательная функция для безопасного создания ConnectionOut без дублирования полей"""
    return ConnectionOut(
        id=connection.id,
        database_name=connection.database_name,
        description=description,
        host=connection.host,
        port=connection.port,
        username=connection.username,
        name=connection.name,
        database_type=connection.database_type,
        environment=connection.environment,
        is_favorite=connection.is_favorite,
        owner_id=connection.owner_id,
        owner_username=owner_username,
        status=status,
        db_size_mb=db_size_mb,
        created_at=connection.created_at,
        updated_at=connection.updated_at,
    )


@router.get("/", response_model=PaginatedConnectionResponse)
async def list_connections(
        db: AsyncSession = Depends(get_db),
        page: int = Query(1, ge=1),
        size: int = Query(20, ge=1, le=200),
        search: Optional[str] = Query(None),
        database_type: Optional[str] = Query(None),
        environment: Optional[str] = Query(None),
        is_favorite: Optional[bool] = Query(None),
):
    """Получить список подключенных баз данных"""
    try:
        query = select(DB_Connection, User.username.label("owner_username")).join(User, DB_Connection.owner_id == User.id)
        filters = []
        if search and search.strip():
            term = f"%{search.strip()}%"
            filters.append(or_(DB_Connection.database_name.ilike(term), DB_Connection.name.ilike(term), DB_Connection.description.ilike(term), ))
        if database_type:
            filters.append(DB_Connection.database_type == database_type)
        if environment:
            filters.append(DB_Connection.environment == environment)
        if is_favorite is not None:
            filters.append(DB_Connection.is_favorite == is_favorite)
        if filters:
            query = query.where(and_(*filters))
        total = (await db.execute(query.with_only_columns(func.count(DB_Connection.id)))).scalar_one()
        query = query.order_by(DB_Connection.name.asc()).offset((page - 1) * size).limit(size)
        rows = (await db.execute(query)).all()
        items = []
        for row in rows:
            connection, owner_username = row
            status_conn, size_mb, db_description, is_connected = await get_db_info(connection)
            effective_description = connection.description
            if is_connected:
                effective_description = await sync_description_if_needed(db, connection, db_description)
            items.append(build_connection_out(connection, owner_username, status_conn, size_mb, effective_description))
        pages = (total + size - 1) // size if size > 0 else 1
        return PaginatedConnectionResponse(items=items, total=total, page=page, size=size, pages=pages, has_next=page < pages, has_prev=page > 1)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при получении списка подключений: {str(e)}")


@router.post("/", response_model=ConnectionOut, status_code=201)
async def create_connection(connection: ConnectionCreate, db: AsyncSession = Depends(get_db)):
    """Создать новое подключение к базе данных"""
    if not (await db.execute(select(User).where(User.id == connection.owner_id))).scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Владелец не найден")
    encrypted_password = encrypt_password(connection.password)
    db_connection = DB_Connection(**connection.model_dump(exclude={"password"}), password=encrypted_password)
    db.add(db_connection)
    await db.commit()
    await db.refresh(db_connection)
    owner_username = (await db.execute(select(User.username).where(User.id == db_connection.owner_id))).scalar_one()
    status_conn, size, db_description, is_connected = await get_db_info(db_connection)
    effective_description = db_connection.description
    if is_connected:
        effective_description = await sync_description_if_needed(db, db_connection, db_description)
    return build_connection_out(db_connection, owner_username, status_conn, size, effective_description)


@router.put("/{connection_id}", response_model=ConnectionOut)
async def update_connection(connection_id: int, connection: ConnectionUpdate, db: AsyncSession = Depends(get_db)):
    """Обновить подключение к базе данных"""
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
    _, _, db_description, is_connected = await get_db_info(db_connection)
    effective_description = db_connection.description
    if is_connected:
        effective_description = await sync_description_if_needed(db, db_connection, db_description)
        if "description" in update_data:
            try:
                async with external_db_connection(db_connection, timeout=10) as ext_conn:
                    quoted_db = asyncpg.utils._quote_ident(db_connection.database_name)
                    comment_value = update_data["description"] or ''
                    await ext_conn.execute(f"COMMENT ON DATABASE {quoted_db} IS $${comment_value}$$")
            except Exception:
                pass
    owner_username = (await db.execute(select(User.username).where(User.id == db_connection.owner_id))).scalar_one()
    return build_connection_out(db_connection, owner_username, "connected" if is_connected else "error", None, effective_description)


@router.delete("/{connection_id}", status_code=204)
async def delete_connection(connection_id: int, db: AsyncSession = Depends(get_db)):
    """Удалить подключение к базе данных"""
    db_connection = (await db.execute(select(DB_Connection).where(DB_Connection.id == connection_id))).scalar_one_or_none()
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
        username: Optional[str] = Query(None, description="Поиск по имени пользователя")
):
    """Получить список активных подключений к базе данных"""
    try:
        service = DBConnectionService(db)
        return await service.get_active_connections(connection_id=connection_id, page=page, size=size, username=username)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при получении активных подключений: {str(e)}")


@router.delete("/{connection_id}/active-connections/terminate", response_model=dict)
async def terminate_active_connection(connection_id: int, request: TerminateConnectionRequest, db: AsyncSession = Depends(get_db)):
    """Завершить активное подключение (процесс) к базе данных по PID"""
    try:
        service = DBConnectionService(db)
        return await service.terminate_backend_process(connection_id, request.pid)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при завершении процесса: {str(e)}")


@router.patch("/{connection_id}/favorite", response_model=ConnectionOut)
async def update_connection_favorite(connection_id: int, favorite_update: ConnectionFavoriteUpdate, db: AsyncSession = Depends(get_db)):
    """Обновить статус избранного подключения к базе данных"""
    db_connection = (await db.execute(select(DB_Connection).where(DB_Connection.id == connection_id))).scalar_one_or_none()
    if not db_connection:
        raise HTTPException(status_code=404, detail="Подключение не найдено")
    db_connection.is_favorite = favorite_update.is_favorite
    await db.commit()
    await db.refresh(db_connection)
    status_conn, size, db_description, is_connected = await get_db_info(db_connection)
    effective_description = db_connection.description
    if is_connected:
        effective_description = await sync_description_if_needed(db, db_connection, db_description)
    owner_username = (await db.execute(select(User.username).where(User.id == db_connection.owner_id))).scalar_one()
    return build_connection_out(db_connection, owner_username, status_conn, size, effective_description)