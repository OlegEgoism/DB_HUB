# backend/api/v1/db_connection.py
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
import asyncpg
from backend.database.session import get_db
from backend.models.db import DB_Connection
from backend.models.user import User
from backend.core.security import encrypt_password, decrypt_password
from backend.schemas.db_connection_schemas import PaginatedConnectionResponse
from sqlalchemy import func
from backend.schemas.db_connection_schemas import (
    ConnectionCreate,
    ConnectionOut,
    ConnectionUpdate
)

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
        size: int = Query(20, ge=1, le=200, description="Количество записей на странице (1–200)")
):
    try:
        total_result = await db.execute(select(func.count(DB_Connection.id)))
        total = total_result.scalar_one()
        pages = (total + size - 1) // size
        has_next = page < pages
        has_prev = page > 1
        skip = (page - 1) * size
        result = await db.execute(select(DB_Connection).order_by(DB_Connection.name).offset(skip).limit(size))
        connections = result.scalars().all()
        items = []
        for c in connections:
            status, db_size = await get_db_status_and_size(c)
            items.append(ConnectionOut(**c.__dict__, status=status, db_size_mb=db_size))
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


@router.get("/search/", response_model=List[ConnectionOut])
async def search_connections(
        database_name: Optional[str] = Query(None, description="Поиск по названию базы данных"),
        name: Optional[str] = Query(None, description="Поиск по названию подключения"),
        description: Optional[str] = Query(None, description="Поиск по описанию"),
        database_type: Optional[str] = Query(None, description="Фильтр по типу СУБД"),
        environment: Optional[str] = Query(None, description="Фильтр по окружению"),
        is_favorite: Optional[bool] = Query(None, description="Фильтр по избранному"),
        owner_id: Optional[int] = Query(None, description="Фильтр по владельцу"),
        db: AsyncSession = Depends(get_db),
        page: int = Query(1, ge=1, description="Номер страницы, начиная с 1"),
        size: int = Query(20, ge=1, le=200, description="Количество записей на странице (1-200)")

):
    """Поиск подключений"""
    try:
        skip = (page - 1) * size
        query = select(DB_Connection)
        filters = []
        if database_name:
            filters.append(DB_Connection.database_name.ilike(f"%{database_name}%"))
        if name:
            filters.append(DB_Connection.name.ilike(f"%{name}%"))
        if description:
            filters.append(DB_Connection.description.ilike(f"%{description}%"))
        if database_type:
            filters.append(DB_Connection.database_type == database_type)
        if environment:
            filters.append(DB_Connection.environment == environment)
        if is_favorite is not None:
            filters.append(DB_Connection.is_favorite == is_favorite)
        if owner_id:
            filters.append(DB_Connection.owner_id == owner_id)
        if filters:
            query = query.where(and_(*filters))
        query = query.order_by(DB_Connection.name).offset(skip).limit(size)
        result = await db.execute(query)
        connections = result.scalars().all()
        response = []
        for conn in connections:
            status_conn, size_mb = await get_db_status_and_size(conn)
            response.append(ConnectionOut(**conn.__dict__, status=status_conn, db_size_mb=size_mb))
        return response
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при поиске подключений: {str(e)}")


@router.get("/{connection_id}", response_model=ConnectionOut)
async def read_connection(connection_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DB_Connection).where(DB_Connection.id == connection_id))
    connection = result.scalar_one_or_none()
    if not connection:
        raise HTTPException(status_code=404, detail="Подключение не найдено")
    status, size = await get_db_status_and_size(connection)
    return ConnectionOut(**connection.__dict__, status=status, db_size_mb=size)


@router.post("/", response_model=ConnectionOut, status_code=status.HTTP_201_CREATED)
async def create_connection_endpoint(connection: ConnectionCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == connection.owner_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Владелец не найден")
    encrypted_password = encrypt_password(connection.password)
    db_connection = DB_Connection(**connection.model_dump(exclude={"password"}), password=encrypted_password)
    db.add(db_connection)
    await db.commit()
    await db.refresh(db_connection)
    status_conn, size = await get_db_status_and_size(db_connection)
    return ConnectionOut(**db_connection.__dict__, status=status_conn, db_size_mb=size)


@router.put("/{connection_id}", response_model=ConnectionOut)
async def update_connection_endpoint(connection_id: int, connection: ConnectionUpdate, db: AsyncSession = Depends(get_db)):
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
    status_conn, size = await get_db_status_and_size(db_connection)
    return ConnectionOut(**db_connection.__dict__, status=status_conn, db_size_mb=size)


@router.delete("/{connection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_connection_endpoint(connection_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DB_Connection).where(DB_Connection.id == connection_id))
    db_connection = result.scalar_one_or_none()
    if not db_connection:
        raise HTTPException(status_code=404, detail="Подключение не найдено")
    await db.delete(db_connection)
    await db.commit()
