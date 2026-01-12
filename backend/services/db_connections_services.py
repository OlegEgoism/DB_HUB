# backend/services/db_connections_services.py
import asyncpg
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.models.db import DB_Connection
from backend.core.security import decrypt_password
import math
from typing import Optional
from backend.schemas.db_connections_schemas import PaginatedActiveConnectionsResponse


class DBConnectionService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_connection(self, connection_id: int) -> DB_Connection | None:
        """Подключение к базе данных"""
        result = await self.db.execute(select(DB_Connection).where(DB_Connection.id == connection_id))
        return result.scalar_one_or_none()

    async def _connect_to_external_db(self, db_connection: DB_Connection):
        """Установить подключение с базой данных"""
        password = decrypt_password(db_connection.password)
        return await asyncpg.connect(
            host=db_connection.host,
            port=db_connection.port,
            user=db_connection.username,
            password=password,
            database=db_connection.database_name,
            timeout=10,
        )

    async def get_active_connections(self, connection_id: int, page: int = 1, size: int = 20, username: Optional[str] = None) -> PaginatedActiveConnectionsResponse:
        """Получить список активных подключений к базе данных"""
        connection = await self.get_connection(connection_id)
        if not connection:
            raise ValueError("Подключение не найдено")
        where_conditions = ["state IS NOT NULL", "pid <> pg_backend_pid()"]
        params = []
        param_index = 1
        if username and username.strip():
            where_conditions.append(f"usename ILIKE ${param_index}")
            params.append(f"%{username.strip()}%")
            param_index += 1
        where_clause = " AND ".join(where_conditions)
        try:
            async with await self._connect_to_external_db(connection) as conn:
                total_all_result = await conn.fetchrow("""
                    SELECT COUNT(*) as total
                    FROM pg_stat_activity
                    WHERE state IS NOT NULL
                      AND pid <> pg_backend_pid()
                """)
                total_all = total_all_result["total"] if total_all_result else 0
                total_filtered_query = f"""
                    SELECT COUNT(*) as total
                    FROM pg_stat_activity
                    WHERE {where_clause}
                """
                total_filtered_result = await conn.fetchrow(total_filtered_query, *params)
                total_filtered = total_filtered_result["total"] if total_filtered_result else 0
                offset = (page - 1) * size
                limit = size
                data_query = f"""
                    SELECT
                        pid,
                        usename AS username,
                        application_name,
                        client_addr::text AS client_addr,
                        client_hostname,
                        client_port,
                        backend_start,
                        query_start,
                        state_change,
                        state,
                        query
                    FROM pg_stat_activity
                    WHERE {where_clause}
                    ORDER BY backend_start DESC
                    LIMIT ${param_index} OFFSET ${param_index + 1};
                """
                rows = await conn.fetch(data_query, *params, limit, offset)
                active_connections = []
                for row in rows:
                    active_connections.append({
                        "pid": row["pid"],
                        "username": row["username"],
                        "application_name": row["application_name"],
                        "client_addr": row["client_addr"],
                        "client_hostname": row["client_hostname"],
                        "client_port": row["client_port"],
                        "backend_start": row["backend_start"],
                        "query_start": row["query_start"],
                        "state_change": row["state_change"],
                        "state": row["state"],
                        "query": row["query"] or ""
                    })
                pages = math.ceil(total_filtered / size) if size > 0 and total_filtered > 0 else 1
                has_next = page < pages
                has_prev = page > 1
                return PaginatedActiveConnectionsResponse(
                    connection_id=connection.id,
                    connection_name=connection.name,
                    total_active_connections=total_all,
                    total_filtered_connections=total_filtered,
                    page=page,
                    size=size,
                    pages=pages,
                    has_next=has_next,
                    has_prev=has_prev,
                    active_connections=active_connections
                )
        except Exception as e:
            raise Exception(f"Ошибка при получении активных подключений: {str(e)}") from e

    async def terminate_backend_process(self, connection_id: int, pid: int) -> dict:
        """Завершить активное подключение (процесс) к базе данных по PID"""
        if pid <= 0:
            raise ValueError("Недопустимый PID")
        connection = await self.get_connection(connection_id)
        if not connection:
            raise ValueError("Подключение не найдено")
        try:
            async with await self._connect_to_external_db(connection) as conn:
                exists = await conn.fetchval("""
                    SELECT 1 FROM pg_stat_activity
                    WHERE pid = $1 AND pid <> pg_backend_pid()
                """, pid)
                if not exists:
                    raise ValueError(f"Процесс с PID {pid} не найден или уже завершён")
                result = await conn.fetchval("SELECT pg_terminate_backend($1)", pid)
                if result:
                    return {"success": True, "message": f"Процесс с PID {pid} успешно завершён", "pid": pid, "connection_id": connection_id}
                else:
                    raise Exception(f"Не удалось завершить процесс с PID {pid}")
        except Exception as e:
            raise Exception(f"Ошибка при завершении процесса: {str(e)}") from e
