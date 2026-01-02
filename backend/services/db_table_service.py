# backend/services/db_table_service.py
import asyncpg
import math
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.models.db import DB_Connection
from backend.core.security import decrypt_password

class DBTableService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_connection(self, connection_id: int) -> DB_Connection:
        result = await self.db.execute(select(DB_Connection).where(DB_Connection.id == connection_id))
        connection = result.scalar_one_or_none()
        if not connection:
            raise ValueError(f"Подключение с ID {connection_id} не найдено")
        return connection

    async def _execute_query(self, connection: DB_Connection, query: str, *params) -> List[asyncpg.Record]:
        password = decrypt_password(connection.password)
        conn = await asyncpg.connect(
            host=connection.host,
            port=connection.port,
            user=connection.username,
            password=password,
            database=connection.database_name,
            timeout=10
        )
        try:
            rows = await conn.fetch(query, *params)
            return rows
        finally:
            await conn.close()

    async def get_tables_in_schema(
        self,
        connection_id: int,
        schema_oid: int,
        page: int = 1,
        size: int = 20,
        search: Optional[str] = None,
        sort_by: str = "table_name",
        sort_order: str = "asc"
    ) -> Dict[str, Any]:
        connection = await self._get_connection(connection_id)

        # Получаем имя схемы
        schema_query = "SELECT nspname FROM pg_namespace WHERE oid = $1"
        schema_row = await self._execute_query(connection, schema_query, schema_oid)
        if not schema_row:
            raise ValueError(f"Схема с OID {schema_oid} не найдена")
        schema_name = schema_row[0]["nspname"]

        base_query = """
        SELECT
            c.oid,
            c.relname AS table_name,
            c.relkind AS table_type_code,
            pg_catalog.pg_get_userbyid(c.relowner) AS owner,
            pg_catalog.obj_description(c.oid, 'pg_class') AS description,
            pg_catalog.pg_total_relation_size(c.oid) AS size_bytes,
            pg_size_pretty(pg_catalog.pg_total_relation_size(c.oid)) AS size_pretty,
            c.reltuples AS estimated_row_count
        FROM pg_catalog.pg_class c
        WHERE c.relnamespace = $1
          AND c.relkind IN ('r', 'm', 'v', 'f', 'p')
        """

        where_conditions = []
        params = [schema_oid]

        if search and search.strip():
            search_term = f"%{search.strip().lower()}%"
            where_conditions.append("""
                (LOWER(c.relname) LIKE $2 OR LOWER(pg_catalog.obj_description(c.oid, 'pg_class')) LIKE $2)
            """)
            params.append(search_term)

        if where_conditions:
            base_query += " AND " + " AND ".join(where_conditions)

        count_query = f"SELECT COUNT(*) AS total FROM ({base_query}) AS sub"
        count_rows = await self._execute_query(connection, count_query, *params)
        total_filtered = count_rows[0]["total"] if count_rows else 0

        total_query = """
        SELECT COUNT(*) AS total
        FROM pg_catalog.pg_class c
        WHERE c.relnamespace = $1 AND c.relkind IN ('r', 'm', 'v', 'f', 'p')
        """
        total_rows = await self._execute_query(connection, total_query, schema_oid)
        total_all = total_rows[0]["total"] if total_rows else 0

        valid_sort_fields = {
            "table_name": "c.relname",
            "owner": "owner",
            "size_bytes": "size_bytes",
            "estimated_row_count": "c.reltuples"
        }
        sort_field = valid_sort_fields.get(sort_by, "c.relname")
        sort_dir = "DESC" if sort_order.lower() == "desc" else "ASC"

        offset = (page - 1) * size
        paginated_query = f"""
        {base_query}
        ORDER BY {sort_field} {sort_dir}
        LIMIT ${len(params) + 1} OFFSET ${len(params) + 2}
        """
        params_with_pagination = params + [size, offset]

        rows = await self._execute_query(connection, paginated_query, *params_with_pagination)

        # Маппинг типов
        kind_map = {
            'r': 'table',
            'm': 'materialized_view',
            'v': 'view',
            'f': 'foreign_table',
            'p': 'partitioned_table'
        }

        tables = []
        for row in rows:
            tables.append({
                "oid": row["oid"],
                "table_name": row["table_name"],
                "table_type": kind_map.get(row["table_type_code"], row["table_type_code"]),
                "owner": row["owner"],
                "description": row["description"],
                "size_bytes": row["size_bytes"],
                "size_pretty": row["size_pretty"],
                "estimated_row_count": int(row["estimated_row_count"]) if row["estimated_row_count"] is not None else None
            })

        pages = math.ceil(total_filtered / size) if size > 0 and total_filtered > 0 else 1
        has_next = page < pages
        has_prev = page > 1

        return {
            "connection_id": connection_id,
            "schema_oid": schema_oid,
            "schema_name": schema_name,
            "total_tables": total_all,
            "total_filtered_tables": total_filtered,
            "page": page,
            "size": size,
            "pages": pages,
            "has_next": has_next,
            "has_prev": has_prev,
            "tables": tables
        }