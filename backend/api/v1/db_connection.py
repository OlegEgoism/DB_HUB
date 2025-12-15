# backend/api/v1/db_connection.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import asyncpg
from backend.database.session import get_db
from backend.models.db import Connection
from backend.models.user import User
from backend.schemas.db_connection_schemas import (
    ConnectionCreate,
    ConnectionOut,
    ConnectionUpdate
)
from backend.core.security import encrypt_password, decrypt_password

router = APIRouter(prefix="/db_connections", tags=["DB CONNECTION"])


async def get_db_status_and_size(connection: Connection) -> tuple[str, float | None]:
    """Проверяет подключение и возвращает (status, size_mb)"""
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


@router.get("/", response_model=List[ConnectionOut])
async def list_connections(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Connection))
    connections = result.scalars().all()
    response = []
    for c in connections:
        status, size = await get_db_status_and_size(c)
        response.append(ConnectionOut(**c.__dict__, status=status, db_size_mb=size))
    return response


@router.get("/{connection_id}", response_model=ConnectionOut)
async def read_connection(connection_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Connection).where(Connection.id == connection_id))
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
    db_connection = Connection(**connection.model_dump(exclude={"password"}), password=encrypted_password)
    db.add(db_connection)
    await db.commit()
    await db.refresh(db_connection)
    status_conn, size = await get_db_status_and_size(db_connection)
    return ConnectionOut(**db_connection.__dict__, status=status_conn, db_size_mb=size)


@router.put("/{connection_id}", response_model=ConnectionOut)
async def update_connection_endpoint(connection_id: int, connection: ConnectionUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Connection).where(Connection.id == connection_id))
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
    result = await db.execute(select(Connection).where(Connection.id == connection_id))
    db_connection = result.scalar_one_or_none()
    if not db_connection:
        raise HTTPException(status_code=404, detail="Подключение не найдено")
    await db.delete(db_connection)
    await db.commit()
