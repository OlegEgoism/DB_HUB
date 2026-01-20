# backend/services/db_connections_services.py
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models.db import DB_Connection
import math
from typing import Optional
from backend.schemas.db_connections_schemas import PaginatedActiveConnectionsResponse
from backend.utils.external_db import external_db_connection, get_db_connection_by_id


class DBConnectionService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_connection(self, connection_id: int) -> DB_Connection | None:
        return await get_db_connection_by_id(self.db, connection_id)

    async def get_active_connections(
        self,
        connection_id: int,
        page: int = 1,
        size: int = 20,
        username: Optional[str] = None,
        min_duration_ms: Optional[int] = None,
        max_duration_ms: Optional[int] = None,
    ) -> PaginatedActiveConnectionsResponse:
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

        duration_filter_used = min_duration_ms is not None or max_duration_ms is not None
        if duration_filter_used:
            where_conditions.append("query_start IS NOT NULL")

        if min_duration_ms is not None:
            where_conditions.append(f"(EXTRACT(EPOCH FROM (now() - query_start)) * 1000) >= ${param_index}")
            params.append(min_duration_ms)
            param_index += 1

        if max_duration_ms is not None:
            where_conditions.append(f"(EXTRACT(EPOCH FROM (now() - query_start)) * 1000) <= ${param_index}")
            params.append(max_duration_ms)
            param_index += 1

        where_clause = " AND ".join(where_conditions)

        async with external_db_connection(connection) as conn:
            total_all_row = await conn.fetchrow(
                """
                SELECT COUNT(*) AS total
                FROM pg_stat_activity
                WHERE state IS NOT NULL AND pid <> pg_backend_pid()
            """
            )
            total_all = total_all_row["total"] if total_all_row else 0

            total_filtered_row = await conn.fetchrow(
                f"SELECT COUNT(*) AS total FROM pg_stat_activity WHERE {where_clause}",
                *params,
            )
            total_filtered = total_filtered_row["total"] if total_filtered_row else 0

            offset = (page - 1) * size
            limit = size

            rows = await conn.fetch(
                f"""
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
                    query,
                    CASE
                        WHEN query_start IS NOT NULL THEN
                            EXTRACT(EPOCH FROM (now() - query_start)) * 1000
                        ELSE NULL
                    END AS duration_ms
                FROM pg_stat_activity
                WHERE {where_clause}
                ORDER BY backend_start DESC
                LIMIT ${param_index} OFFSET ${param_index + 1}
                """,
                *params,
                limit,
                offset,
            )

            active_connections = []
            for r in rows:
                duration_ms = int(round(r["duration_ms"])) if r["duration_ms"] is not None else None
                active_connections.append(
                    {
                        "pid": r["pid"],
                        "username": r["username"],
                        "application_name": r["application_name"],
                        "client_addr": r["client_addr"],
                        "client_hostname": r["client_hostname"],
                        "client_port": r["client_port"],
                        "backend_start": r["backend_start"],
                        "query_start": r["query_start"],
                        "state_change": r["state_change"],
                        "state": r["state"],
                        "query": r["query"] or "",
                        "duration_ms": duration_ms,
                    }
                )

            pages = math.ceil(total_filtered / size) if size > 0 and total_filtered > 0 else 1

            return PaginatedActiveConnectionsResponse(
                connection_id=connection.id,
                connection_name=connection.name,
                total_active_connections=total_all,
                total_filtered_connections=total_filtered,
                page=page,
                size=size,
                pages=pages,
                has_next=page < pages,
                has_prev=page > 1,
                active_connections=active_connections,
            )

    async def terminate_backend_process(self, connection_id: int, pid: int) -> dict:
        if pid <= 0:
            raise ValueError("Недопустимый PID")
        connection = await self.get_connection(connection_id)
        if not connection:
            raise ValueError("Подключение не найдено")

        async with external_db_connection(connection) as conn:
            exists = await conn.fetchval(
                """
                SELECT 1 FROM pg_stat_activity
                WHERE pid = $1 AND pid <> pg_backend_pid()
                """,
                pid,
            )
            if not exists:
                raise ValueError(f"Процесс с PID {pid} не найден или уже завершён")

            result = await conn.fetchval("SELECT pg_terminate_backend($1)", pid)
            if result:
                return {
                    "success": True,
                    "message": f"Процесс с PID {pid} успешно завершён",
                    "pid": pid,
                    "connection_id": connection_id,
                }
            else:
                raise Exception(f"Не удалось завершить процесс с PID {pid}")
