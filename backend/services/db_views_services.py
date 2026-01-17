# backend/services/db_views_services.py
import math
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.models.db import DB_Connection
from backend.utils.external_db import external_db_connection


class DBViewsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_connection(self, connection_id: int) -> DB_Connection:
        result = await self.db.execute(select(DB_Connection).where(DB_Connection.id == connection_id))
        connection = result.scalar_one_or_none()
        if not connection:
            raise ValueError(f"Подключение с ID {connection_id} не найдено")
        return connection

    async def get_views(self, connection_id: int, page: int = 1, size: int = 20, search: Optional[str] = None) -> Dict[str, Any]:
        """Получить список представлений (views) с поиском по схеме, имени и описанию"""
        connection = await self._get_connection(connection_id)
        base_query = """
        SELECT
            v.schemaname AS schema_name,
            v.viewname AS view_name,
            v.definition,
            pg_catalog.obj_description(pgc.oid, 'pg_class') AS description
        FROM pg_catalog.pg_views v
        JOIN pg_catalog.pg_class pgc ON pgc.relname = v.viewname
        JOIN pg_catalog.pg_namespace pgn ON pgn.oid = pgc.relnamespace AND pgn.nspname = v.schemaname
        WHERE v.schemaname NOT IN ('pg_catalog', 'information_schema')
        """
        search_term = search.strip().lower() if search and search.strip() else None
        filtered_query = base_query
        count_query = f"SELECT COUNT(*) AS total FROM ({base_query}) AS sub"
        params = []
        if search_term:
            filtered_query += """
            AND (
                LOWER(v.schemaname) LIKE $1
                OR LOWER(v.viewname) LIKE $1
                OR LOWER(v.definition) LIKE $1
                OR LOWER(pg_catalog.obj_description(pgc.oid, 'pg_class')) LIKE $1
            )
            """
            count_query = f"""
            SELECT COUNT(*) AS total FROM (
                {base_query}
                AND (
                    LOWER(v.schemaname) LIKE $1
                    OR LOWER(v.viewname) LIKE $1
                    OR LOWER(v.definition) LIKE $1
                    OR LOWER(pg_catalog.obj_description(pgc.oid, 'pg_class')) LIKE $1
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
            ORDER BY v.schemaname, v.viewname
            LIMIT ${len(params) + 1} OFFSET ${len(params) + 2}
            """
            paginated_params = params + [size, offset]
            rows = await conn.fetch(paginated_query, *paginated_params)
        views = []
        for row in rows:
            views.append({"schema_name": row["schema_name"], "view_name": row["view_name"], "description": row["description"], "definition": row["definition"], })
        pages = math.ceil(total_filtered / size) if size > 0 and total_filtered > 0 else 1
        has_next = page < pages
        has_prev = page > 1
        return {"connection_id": connection.id, "connection_name": connection.name, "total_views": total_all, "total_filtered_views": total_filtered, "page": page, "size": size, "pages": pages, "has_next": has_next, "has_prev": has_prev, "views": views, }

    async def get_materialized_views(self, connection_id: int, page: int = 1, size: int = 20, search: Optional[str] = None) -> Dict[str, Any]:
        """Получить список материализованных представлений"""
        connection = await self._get_connection(connection_id)
        base_query = """
        SELECT
            n.nspname AS schema_name,
            c.relname AS view_name,
            pg_catalog.obj_description(c.oid, 'pg_class') AS description,
            pg_get_viewdef(c.oid) AS definition
        FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'm'
          AND n.nspname NOT IN ('pg_catalog', 'information_schema')
        """
        search_term = search.strip().lower() if search and search.strip() else None
        filtered_query = base_query
        count_query = f"SELECT COUNT(*) AS total FROM ({base_query}) AS sub"
        params = []
        if search_term:
            filtered_query += """
            AND (
                LOWER(c.relname) LIKE $1
                OR LOWER(n.nspname) LIKE $1
                OR LOWER(pg_catalog.obj_description(c.oid, 'pg_class')) LIKE $1
            )
            """
            count_query = f"""
            SELECT COUNT(*) AS total FROM (
                {base_query}
                AND (
                    LOWER(c.relname) LIKE $1
                    OR LOWER(n.nspname) LIKE $1
                    OR LOWER(pg_catalog.obj_description(c.oid, 'pg_class')) LIKE $1
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
            ORDER BY n.nspname, c.relname
            LIMIT ${len(params) + 1} OFFSET ${len(params) + 2}
            """
            paginated_params = params + [size, offset]
            rows = await conn.fetch(paginated_query, *paginated_params)
        materialized_views = []
        for row in rows:
            definition = (row["definition"] or "").replace("\\n", "\n")
            materialized_views.append({"schema_name": row["schema_name"], "view_name": row["view_name"], "description": row["description"], "definition": definition, })
        pages = math.ceil(total_filtered / size) if size > 0 and total_filtered > 0 else 1
        has_next = page < pages
        has_prev = page > 1
        return {"connection_id": connection.id, "connection_name": connection.name, "total_materialized_views": total_all, "total_filtered_materialized_views": total_filtered, "page": page, "size": size, "pages": pages, "has_next": has_next, "has_prev": has_prev, "materialized_views": materialized_views, }
