# backend/services/db_functions_services.py
import math
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models.db import DB_Connection
from backend.utils.external_db import external_db_connection, get_db_connection_by_id


class DBFunctionService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_connection(self, connection_id: int) -> DB_Connection:
        connection = await get_db_connection_by_id(self.db, connection_id)
        if not connection:
            raise ValueError(f"Подключение с id {connection_id} не найдено")
        return connection

    async def get_functions(
        self,
        connection_id: int,
        page: int = 1,
        size: int = 20,
        search: Optional[str] = None,
    ) -> Dict[str, Any]:
        if page < 1:
            page = 1
        if size < 1:
            size = 1
        if size > 1000:
            size = 1000
        connection = await self._get_connection(connection_id)
        base_query = """
        SELECT
            n.nspname AS schema_name,
            p.proname AS function_name,
            pg_catalog.obj_description(p.oid, 'pg_proc') AS description,
            pg_get_functiondef(p.oid) AS definition
        FROM pg_catalog.pg_proc p
        JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
        """
        search_term = search.strip().lower() if search and search.strip() else None
        filtered_query = base_query
        count_query = f"SELECT COUNT(*) AS total FROM ({base_query}) AS sub"
        params = []
        if search_term:
            filtered_query += """
            AND (
                LOWER(p.proname) LIKE $1
                OR LOWER(n.nspname) LIKE $1
                OR LOWER(pg_catalog.obj_description(p.oid, 'pg_proc')) LIKE $1
            )
            """
            count_query = f"""
            SELECT COUNT(*) AS total FROM (
                {base_query}
                AND (
                    LOWER(p.proname) LIKE $1
                    OR LOWER(n.nspname) LIKE $1
                    OR LOWER(pg_catalog.obj_description(p.oid, 'pg_proc')) LIKE $1
                )
            ) AS sub
            """
            params.append(f"%{search_term}%")
        async with external_db_connection(connection) as conn:
            total_all_res = await conn.fetchrow(
                f"SELECT COUNT(*) AS total FROM ({base_query}) AS sub"
            )
            total_all = total_all_res["total"] if total_all_res else 0
            total_filtered_res = await conn.fetchrow(count_query, *params)
            total_filtered = total_filtered_res["total"] if total_filtered_res else 0
            offset = (page - 1) * size
            paginated_query = f"""
            {filtered_query}
            ORDER BY n.nspname, p.proname
            LIMIT {size} OFFSET {offset}
            """
            rows = await conn.fetch(paginated_query, *params)
        functions = []
        for row in rows:
            definition = (row["definition"] or "").replace("\\n", "\n")
            functions.append(
                {
                    "schema_name": row["schema_name"],
                    "function_name": row["function_name"],
                    "description": row["description"],
                    "definition": definition,
                }
            )
        pages = (
            math.ceil(total_filtered / size) if size > 0 and total_filtered > 0 else 1
        )
        has_next = page < pages
        has_prev = page > 1
        return {
            "connection_id": connection.id,
            "connection_name": connection.name,
            "total_functions": total_all,
            "total_filtered_functions": total_filtered,
            "page": page,
            "size": size,
            "pages": pages,
            "has_next": has_next,
            "has_prev": has_prev,
            "functions": functions,
        }
