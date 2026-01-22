# backend/services/db_views_services.py
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models.db import DB_Connection
from backend.utils.external_db import external_db_connection, get_db_connection_by_id
from backend.utils.pagination import paginate_raw_sql, PaginatedServiceResponse


def _map_view_row(row) -> dict:
    return {
        "schema_name": row["schema_name"],
        "view_name": row["view_name"],
        "description": row["description"],
        "definition": row["definition"],
    }


def _map_materialized_view_row(row) -> dict:
    definition = (row["definition"] or "").replace("\\n", "\n")
    return {
        "schema_name": row["schema_name"],
        "view_name": row["view_name"],
        "description": row["description"],
        "definition": definition,
    }


class DBViewsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_connection(self, connection_id: int) -> DB_Connection:
        connection = await get_db_connection_by_id(self.db, connection_id)
        if not connection:
            raise ValueError(f"Подключение с id {connection_id} не найдено")
        return connection

    async def get_views(
        self,
        connection_id: int,
        page: int = 1,
        size: int = 20,
        search: Optional[str] = None,
    ) -> Dict[str, Any]:
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

        filtered_query = base_query
        count_query = f"SELECT COUNT(*) AS total FROM ({base_query}) AS sub"
        params = []
        search_term = search.strip().lower() if search and search.strip() else None

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
            total_all_row = await conn.fetchrow(f"SELECT COUNT(*) AS total FROM ({base_query}) AS sub")
            total_all = total_all_row["total"] if total_all_row else 0

            views, total_filtered = await paginate_raw_sql(
                conn,
                filtered_query,
                count_query,
                page=page,
                size=size,
                params=params,
                row_mapper=_map_view_row,
            )

        response = PaginatedServiceResponse.prepare_response(
            connection_id=connection.id,
            connection_name=connection.name,
            total_items=total_all,
            total_filtered_items=total_filtered,
            page=page,
            size=size,
        )
        response["views"] = views
        response["total_views"] = total_all
        response["total_filtered_views"] = total_filtered
        return response

    async def get_materialized_views(
        self,
        connection_id: int,
        page: int = 1,
        size: int = 20,
        search: Optional[str] = None,
    ) -> Dict[str, Any]:
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

        filtered_query = base_query
        count_query = f"SELECT COUNT(*) AS total FROM ({base_query}) AS sub"
        params = []
        search_term = search.strip().lower() if search and search.strip() else None

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
            total_all_row = await conn.fetchrow(f"SELECT COUNT(*) AS total FROM ({base_query}) AS sub")
            total_all = total_all_row["total"] if total_all_row else 0

            materialized_views, total_filtered = await paginate_raw_sql(
                conn,
                filtered_query,
                count_query,
                page=page,
                size=size,
                params=params,
                row_mapper=_map_materialized_view_row,
            )

        response = PaginatedServiceResponse.prepare_response(
            connection_id=connection.id,
            connection_name=connection.name,
            total_items=total_all,
            total_filtered_items=total_filtered,
            page=page,
            size=size,
        )
        response["materialized_views"] = materialized_views
        response["total_materialized_views"] = total_all
        response["total_filtered_materialized_views"] = total_filtered
        return response
