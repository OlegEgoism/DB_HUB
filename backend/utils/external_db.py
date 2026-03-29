# backend/utils/external_db.py

import os
from contextlib import asynccontextmanager

import asyncpg
from backend.core.security import decrypt_password
from backend.models.db import DB_Connection
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

LOCALHOST_ALIASES = {"localhost", "127.0.0.1", "::1"}


def resolve_external_hosts(host: str) -> list[str]:
    """Возвращает список хостов-кандидатов для подключения к внешней БД."""
    normalized_host = host.strip()
    map_localhost = os.getenv("DBHUB_MAP_LOCALHOST_TO_HOST", "1") == "1"

    if not map_localhost or normalized_host.lower() not in LOCALHOST_ALIASES:
        return [normalized_host]

    # Основной alias для доступа к хост-машине из Docker.
    primary_host = os.getenv("DOCKER_HOST_GATEWAY_HOSTNAME", "host.docker.internal")
    # Резервный адрес docker bridge на Linux.
    fallback_ip = os.getenv("DOCKER_HOST_GATEWAY_IP", "172.17.0.1")

    candidates = [primary_host, fallback_ip]
    # Убираем дубликаты, сохраняя порядок.
    unique_candidates: list[str] = []
    for candidate in candidates:
        if candidate and candidate not in unique_candidates:
            unique_candidates.append(candidate)
    return unique_candidates


@asynccontextmanager
async def external_db_connection(db_connection: DB_Connection, timeout: int = 10):
    """Асинхронный контекстный менеджер для подключения к внешней базе данных"""
    password = decrypt_password(db_connection.password)
    candidate_hosts = resolve_external_hosts(db_connection.host)

    last_error: Exception | None = None
    conn = None
    for candidate_host in candidate_hosts:
        try:
            conn = await asyncpg.connect(
                host=candidate_host,
                port=db_connection.port,
                user=db_connection.username,
                password=password,
                database=db_connection.database_name,
                timeout=timeout,
            )
            break
        except Exception as exc:  # noqa: BLE001
            last_error = exc

    if conn is None:
        raise ConnectionError(
            f"Не удалось подключиться к внешней БД по хостам {candidate_hosts}. Последняя ошибка: {last_error}"
        )

    try:
        yield conn
    finally:
        await conn.close()


async def get_db_connection_by_id(db: AsyncSession, connection_id: int) -> DB_Connection | None:
    """Получить запись подключения к внешней базе данных"""
    result = await db.execute(select(DB_Connection).where(DB_Connection.id == connection_id))
    return result.scalar_one_or_none()
