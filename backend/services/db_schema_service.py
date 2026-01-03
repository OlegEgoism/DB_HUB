# backend/services/db_schema_service.py
import asyncpg
import math
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.models.db import DB_Connection
from backend.core.security import decrypt_password


class DBSchemaService:
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
            timeout=10,
        )
        try:
            rows = await conn.fetch(query, *params)
            return rows
        finally:
            await conn.close()

    async def get_schemas_with_tables(self, connection_id: int, page: int = 1, size: int = 20, search: Optional[str] = None, ) -> Dict[str, Any]:
        connection = await self._get_connection(connection_id)
        schemas_query = """
        SELECT
            n.nspname AS schema_name,
            pg_catalog.obj_description(n.oid, 'pg_namespace') AS description
        FROM pg_catalog.pg_namespace n
        WHERE n.nspname NOT LIKE 'pg_%'
          AND n.nspname != 'information_schema'
        ORDER BY n.nspname;
        """
        all_schemas_rows = await self._execute_query(connection, schemas_query)
        all_schemas = [
            {"schema_name": row["schema_name"], "description": row["description"]}
            for row in all_schemas_rows
        ]
        search_term = search.strip().lower() if search and search.strip() else None
        schema_display_rules = []
        for s in all_schemas:
            schema_name = s["schema_name"]
            schema_desc = (s["description"] or "").lower()
            schema_matches = (
                    search_term is not None
                    and (search_term in schema_name.lower() or search_term in schema_desc)
            )
            if search_term is None:
                schema_display_rules.append({
                    "schema_name": schema_name,
                    "description": s["description"],
                    "show_all_tables": True
                })
            elif schema_matches:
                schema_display_rules.append({
                    "schema_name": schema_name,
                    "description": s["description"],
                    "show_all_tables": True
                })
            else:
                tables_query = """
                SELECT
                    c.relname AS table_name,
                    pg_catalog.obj_description(c.oid, 'pg_class') AS table_description
                FROM pg_catalog.pg_class c
                JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
                WHERE n.nspname = $1
                  AND c.relkind = 'r'
                """
                table_rows = await self._execute_query(connection, tables_query, schema_name)
                matching_tables = []
                for t in table_rows:
                    tbl_name = t["table_name"].lower()
                    tbl_desc = (t["table_description"] or "").lower()
                    if search_term in tbl_name or search_term in tbl_desc:
                        matching_tables.append(t["table_name"])
                if matching_tables:
                    schema_display_rules.append({
                        "schema_name": schema_name,
                        "description": s["description"],
                        "show_all_tables": False,
                        "matching_tables": matching_tables
                    })
        total_schemas = len(all_schemas)
        total_filtered = len(schema_display_rules)
        start = (page - 1) * size
        end = start + size
        paginated_schemas = schema_display_rules[start:end]
        schemas_with_tables = []
        for item in paginated_schemas:
            schema_name = item["schema_name"]
            show_all = item["show_all_tables"]
            if show_all:
                tables_query = """
                SELECT
                    c.relname AS table_name,
                    pg_catalog.pg_get_userbyid(c.relowner) AS owner,
                    pg_catalog.obj_description(c.oid, 'pg_class') AS description,
                    c.reltuples::bigint AS row_count,
                    pg_total_relation_size(c.oid) AS size_bytes
                FROM pg_catalog.pg_class c
                JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
                WHERE n.nspname = $1
                  AND c.relkind = 'r'
                ORDER BY c.relname;
                """
                table_rows = await self._execute_query(connection, tables_query, schema_name)
            else:
                matching_names = item["matching_tables"]
                placeholders = ', '.join(f'${i + 2}' for i in range(len(matching_names)))
                tables_query = f"""
                SELECT
                    c.relname AS table_name,
                    pg_catalog.pg_get_userbyid(c.relowner) AS owner,
                    pg_catalog.obj_description(c.oid, 'pg_class') AS description,
                    c.reltuples::bigint AS row_count,
                    pg_total_relation_size(c.oid) AS size_bytes
                FROM pg_catalog.pg_class c
                JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
                WHERE n.nspname = $1
                  AND c.relkind = 'r'
                  AND c.relname IN ({placeholders})
                ORDER BY c.relname;
                """
                params = [schema_name] + matching_names
                table_rows = await self._execute_query(connection, tables_query, *params)
            tables = []
            for tr in table_rows:
                row_count = max(0, int(tr["row_count"])) if tr["row_count"] is not None else 0
                size_bytes = tr["size_bytes"] or 0
                size_pretty = self._human_readable_size(size_bytes)
                tables.append({
                    "table_name": tr["table_name"],
                    "owner": tr["owner"],
                    "description": tr["description"],
                    "row_count": row_count,
                    "size_bytes": size_bytes,
                    "size_pretty": size_pretty,
                })
            schemas_with_tables.append({
                "schema_name": schema_name,
                "description": item["description"],
                "tables": tables
            })
        pages = math.ceil(total_filtered / size) if size > 0 and total_filtered > 0 else 1
        has_next = page < pages
        has_prev = page > 1
        return {
            "connection_id": connection.id,
            "connection_name": connection.name,
            "total_schemas": total_schemas,
            "total_filtered_schemas": total_filtered,
            "page": page,
            "size": size,
            "pages": pages,
            "has_next": has_next,
            "has_prev": has_prev,
            "schemas": schemas_with_tables,
        }

    def _human_readable_size(self, size_bytes: int) -> str:
        """Преобразует байты в человекочитаемую строку: 1024 → '1.0 KB'"""
        if size_bytes == 0:
            return "0 B"
        units = ["B", "KB", "MB", "GB", "TB"]
        i = 0
        size = float(size_bytes)
        while size >= 1024.0 and i < len(units) - 1:
            size /= 1024.0
            i += 1
        return f"{size:.1f} {units[i]}"
