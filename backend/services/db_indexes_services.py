# backend/services/db_indexes_services.py
import math
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.models.db import DB_Connection
from backend.utils.external_db import external_db_connection


class DBIndexesService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_connection(self, connection_id: int) -> DB_Connection:
        result = await self.db.execute(select(DB_Connection).where(DB_Connection.id == connection_id))
        connection = result.scalar_one_or_none()
        if not connection:
            raise ValueError(f"Подключение с ID {connection_id} не найдено")
        return connection

    async def get_indexes(self, connection_id: int, page: int = 1, size: int = 20, search: Optional[str] = None) -> Dict[str, Any]:
        connection = await self._get_connection(connection_id)
        base_query = """
        SELECT
            n.nspname AS schema_name,
            i.relname AS index_name,
            t.relname AS table_name,
            pg_catalog.obj_description(i.oid, 'pg_class') AS description,
            pg_get_indexdef(i.oid) AS definition
        FROM pg_catalog.pg_index idx
        JOIN pg_catalog.pg_class i ON i.oid = idx.indexrelid
        JOIN pg_catalog.pg_class t ON t.oid = idx.indrelid
        JOIN pg_catalog.pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
          AND t.relkind = 'r'  -- только обычные таблицы (не представления, не TOAST и т.п.)
          AND i.relkind = 'i'  -- явно указываем: только индексы
        """
        search_term = search.strip().lower() if search and search.strip() else None
        filtered_query = base_query
        count_query = f"SELECT COUNT(*) AS total FROM ({base_query}) AS sub"
        params = []
        if search_term:
            filtered_query += """
            AND (
                LOWER(i.relname) LIKE $1
                OR LOWER(t.relname) LIKE $1
                OR LOWER(n.nspname) LIKE $1
                OR LOWER(pg_catalog.obj_description(i.oid, 'pg_class')) LIKE $1
            )
            """
            count_query = f"""
            SELECT COUNT(*) AS total FROM (
                {base_query}
                AND (
                    LOWER(i.relname) LIKE $1
                    OR LOWER(t.relname) LIKE $1
                    OR LOWER(n.nspname) LIKE $1
                    OR LOWER(pg_catalog.obj_description(i.oid, 'pg_class')) LIKE $1
                )
            ) AS sub
            """
            params.append(f"%{search_term}%")
        async with external_db_connection(connection) as conn:
            total_all_res = await conn.fetchrow(f"SELECT COUNT(*) AS total FROM ({base_query}) AS sub")
            total_all = total_all_res["total"] if total_all_res else 0
            total_filtered_res = await conn.fetchrow(count_query, *params)
            total_filtered = total_filtered_res["total"] if total_filtered_res else 0
            offset = (page - 1) * size
            paginated_query = f"""
            {filtered_query}
            ORDER BY n.nspname, t.relname, i.relname
            LIMIT ${len(params) + 1} OFFSET ${len(params) + 2}
            """
            paginated_params = params + [size, offset]
            rows = await conn.fetch(paginated_query, *paginated_params)
        indexes = []
        for row in rows:
            definition = (row["definition"] or "").replace("\\n", "\n")
            indexes.append({"schema_name": row["schema_name"], "index_name": row["index_name"], "table_name": row["table_name"], "description": row["description"], "definition": definition, })
        pages = math.ceil(total_filtered / size) if size > 0 and total_filtered > 0 else 1
        has_next = page < pages
        has_prev = page > 1
        return {"connection_id": connection.id, "connection_name": connection.name, "total_indexes": total_all, "total_filtered_indexes": total_filtered, "page": page, "size": size, "pages": pages, "has_next": has_next, "has_prev": has_prev, "indexes": indexes, }
