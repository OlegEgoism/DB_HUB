# backend/services/db_query_monitoring_service.py
import math
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models.db import DB_Connection
from backend.utils.external_db import external_db_connection, get_db_connection_by_id


class DBQueryMonitoringService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_connection(self, connection_id: int) -> DB_Connection:
        connection = await get_db_connection_by_id(self.db, connection_id)
        if not connection:
            raise ValueError(f"Подключение с id {connection_id} не найдено")
        return connection

    async def get_slow_queries(
            self,
            connection_id: int,
            min_duration_ms: int = 1000,
            page: int = 1,
            size: int = 20,
            search: Optional[str] = None,
    ) -> Dict[str, Any]:
        if page < 1:
            page = 1
        if size < 1:
            size = 1
        if size > 200:
            size = 200
        if min_duration_ms < 0:
            min_duration_ms = 0
        connection = await self._get_connection(connection_id)
        base_query = """
        SELECT
            pid,
            usename AS username,
            datname AS database,
            client_addr::text AS client_addr,
            application_name,
            backend_start,
            query_start,
            now() - query_start AS duration,
            state,
            query
        FROM pg_stat_activity
        WHERE
            state IN ('active', 'idle in transaction', 'idle in transaction (aborted)')
            AND query_start IS NOT NULL
            AND pid <> pg_backend_pid()
            AND (now() - query_start) >= ($1 || ' milliseconds')::interval
            AND query NOT ILIKE '%pg_stat_activity%'
        """
        count_query = f"SELECT COUNT(*) AS total FROM ({base_query}) AS sub"
        params = [str(min_duration_ms)]
        if search and search.strip():
            search_term = f"%{search.strip().lower()}%"
            base_query += " AND (LOWER(query) LIKE $2 OR LOWER(usename) LIKE $2 OR LOWER(application_name) LIKE $2)"
            count_query = f"SELECT COUNT(*) AS total FROM ({base_query}) AS sub"
            params.append(search_term)
        async with external_db_connection(connection) as conn:
            total_row = await conn.fetchrow(count_query, *params)
            total_filtered = total_row["total"] if total_row else 0
            offset = (page - 1) * size
            paginated_query = f"""
            {base_query}
            ORDER BY duration DESC
            LIMIT ${len(params) + 1} OFFSET ${len(params) + 2}
            """
            final_params = params + [size, offset]
            rows = await conn.fetch(paginated_query, *final_params)
            slow_queries = []
            for row in rows:
                duration_td = row["duration"]
                duration_ms = int(duration_td.total_seconds() * 1000) if duration_td else 0
                slow_queries.append({
                    "pid": row["pid"],
                    "username": row["username"],
                    "database": row["database"],
                    "client_addr": row["client_addr"],
                    "application_name": row["application_name"],
                    "backend_start": row["backend_start"],
                    "query_start": row["query_start"],
                    "duration_ms": duration_ms,
                    "state": row["state"],
                    "query": (row["query"] or "").strip(),
                })
            pages = math.ceil(total_filtered / size) if size > 0 and total_filtered > 0 else 1
            has_next = page < pages
            has_prev = page > 1
            return {
                "connection_id": connection.id,
                "connection_name": connection.name,
                "min_duration_ms": min_duration_ms,
                "total_filtered_slow_queries": total_filtered,
                "page": page,
                "size": size,
                "pages": pages,
                "has_next": has_next,
                "has_prev": has_prev,
                "slow_queries": slow_queries,
            }
