# backend/services/db_indexes_services.py

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.db import DB_Connection
from backend.utils.external_db import external_db_connection, get_db_connection_by_id
from backend.utils.pagination import PaginatedServiceResponse, paginate_raw_sql


def _map_index_row(row) -> dict:
    definition = (row["definition"] or "").replace("\\n", "\n")
    return {
        "schema_name": row["schema_name"],
        "index_name": row["index_name"],
        "table_name": row["table_name"],
        "description": row["description"],
        "definition": definition,
    }


class DBIndexesService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_connection(self, connection_id: int) -> DB_Connection:
        connection = await get_db_connection_by_id(self.db, connection_id)
        if not connection:
            raise ValueError(f"Подключение с id {connection_id} не найдено")
        return connection

    async def get_indexes(
        self,
        connection_id: int,
        page: int = 1,
        size: int = 20,
        search: str | None = None,
    ) -> dict[str, Any]:
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
        AND t.relkind = 'r'
        AND i.relkind = 'i'
        """

        filtered_query = base_query
        count_query = f"SELECT COUNT(*) AS total FROM ({base_query}) AS sub"
        params = []
        search_term = search.strip().lower() if search and search.strip() else None

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
            total_all_row = await conn.fetchrow(f"SELECT COUNT(*) AS total FROM ({base_query}) AS sub")
            total_all = total_all_row["total"] if total_all_row else 0

            indexes, total_filtered = await paginate_raw_sql(
                conn,
                filtered_query,
                count_query,
                page=page,
                size=size,
                params=params,
                row_mapper=_map_index_row,
            )

        response = PaginatedServiceResponse.prepare_response(
            connection_id=connection.id,
            connection_name=connection.name,
            total_items=total_all,
            total_filtered_items=total_filtered,
            page=page,
            size=size,
        )
        response["indexes"] = indexes
        return response
