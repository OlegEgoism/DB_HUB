# backend/utils/external_db.py

import os
from contextlib import asynccontextmanager

import asyncpg
from backend.core.security import decrypt_password
from backend.models.db import DB_Connection
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

LOCALHOST_ALIASES = {"localhost", "127.0.0.1", "::1"}


def resolve_external_host(host: str) -> str:
    """Для Docker-контейнера подменяем localhost на host.docker.internal."""
    map_localhost = os.getenv("DBHUB_MAP_LOCALHOST_TO_HOST", "1") == "1"
    if map_localhost and host.strip().lower() in LOCALHOST_ALIASES:
        return os.getenv("DOCKER_HOST_GATEWAY_HOSTNAME", "host.docker.internal")
    return host


@asynccontextmanager
async def external_db_connection(db_connection: DB_Connection, timeout: int = 10):
    """Асинхронный контекстный менеджер для подключения к внешней базе данных"""
    password = decrypt_password(db_connection.password)
    resolved_host = resolve_external_host(db_connection.host)
    conn = await asyncpg.connect(
        host=resolved_host,
        port=db_connection.port,
        user=db_connection.username,
        password=password,
        database=db_connection.database_name,
        timeout=timeout,
    )
    try:
        yield conn
    finally:
        await conn.close()


async def get_db_connection_by_id(db: AsyncSession, connection_id: int) -> DB_Connection | None:
    """Получить запись подключения к внешней базе данных"""
    result = await db.execute(select(DB_Connection).where(DB_Connection.id == connection_id))
    return result.scalar_one_or_none()
