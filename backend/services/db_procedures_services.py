# backend/services/db_procedures_services.py

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.db import DB_Connection
from backend.utils.external_db import external_db_connection, get_db_connection_by_id
from backend.utils.pagination import PaginatedServiceResponse, paginate_raw_sql


def _map_procedure_row(row) -> dict:
    definition = (row["definition"] or "").replace("\\n", "\n")
    return {
        "schema_name": row["schema_name"],
        "procedure_name": row["procedure_name"],
        "description": row["description"],
        "definition": definition,
    }


class DBProcedureService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_connection(self, connection_id: int) -> DB_Connection:
        connection = await get_db_connection_by_id(self.db, connection_id)
        if not connection:
            raise ValueError(f"Подключение с id {connection_id} не найдено")
        return connection

    async def get_procedures(
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
            p.proname AS procedure_name,
            pg_catalog.obj_description(p.oid, 'pg_proc') AS description,
            pg_get_functiondef(p.oid) AS definition
        FROM pg_catalog.pg_proc p
        JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
        WHERE p.prokind = 'p'
          AND n.nspname NOT IN ('pg_catalog', 'information_schema')
        """

        filtered_query = base_query
        count_query = f"SELECT COUNT(*) AS total FROM ({base_query}) AS sub"
        params = []
        search_term = search.strip().lower() if search and search.strip() else None

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
            total_all_row = await conn.fetchrow(f"SELECT COUNT(*) AS total FROM ({base_query}) AS sub")
            total_all = total_all_row["total"] if total_all_row else 0

            procedures, total_filtered = await paginate_raw_sql(
                conn,
                filtered_query,
                count_query,
                page=page,
                size=size,
                params=params,
                row_mapper=_map_procedure_row,
            )

        response = PaginatedServiceResponse.prepare_response(
            connection_id=connection.id,
            connection_name=connection.name,
            total_items=total_all,
            total_filtered_items=total_filtered,
            page=page,
            size=size,
        )
        response["procedures"] = procedures
        response["total_procedures"] = total_all
        response["total_filtered_procedures"] = total_filtered
        return response
