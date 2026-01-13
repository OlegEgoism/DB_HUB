# backend/utils/external_db.py
import asyncpg
from contextlib import asynccontextmanager
from backend.models.db import DB_Connection
from backend.core.security import decrypt_password


@asynccontextmanager
async def external_db_connection(db_connection: DB_Connection, timeout: int = 10):
    """Асинхронный контекстный менеджер для подключения к внешней базе данных (автоматически закрывает соединение после использования)"""
    password = decrypt_password(db_connection.password)
    conn = await asyncpg.connect(
        host=db_connection.host,
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
