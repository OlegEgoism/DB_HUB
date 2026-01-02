# backend/services/db_schema_service.py
import asyncpg
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.models.db import DB_Connection
from backend.core.security import decrypt_password
import math
import re


class DBSchemaService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_connection(self, connection_id: int) -> DB_Connection:
        """Получить подключение по ID"""
        result = await self.db.execute(select(DB_Connection).where(DB_Connection.id == connection_id))
        connection = result.scalar_one_or_none()
        if not connection:
            raise ValueError(f"Подключение с ID {connection_id} не найдено")
        return connection

    async def _execute_query(self, connection: DB_Connection, query: str, *params) -> List[asyncpg.Record]:
        """Выполнить запрос к внешней БД"""
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

    async def get_schemas_with_statistics(self, connection_id: int, search: Optional[str] = None, page: int = 1, size: int = 20, sort_by: str = "name", sort_order: str = "asc") -> Dict[str, Any]:
        """Получить список схем с подробной статистикой"""
        connection = await self.get_connection(connection_id)
        base_query = """
            SELECT 
                n.oid,
                n.nspname as name,
                pg_catalog.pg_get_userbyid(n.nspowner) as owner,
                pg_catalog.obj_description(n.oid, 'pg_namespace') as description
            FROM pg_catalog.pg_namespace n
            WHERE n.nspname NOT LIKE 'pg\_%'
              AND n.nspname != 'information_schema'
        """
        where_conditions = []
        params = []
        if search and search.strip():
            search_term = f"%{search.strip().lower()}%"
            where_conditions.append("""
                (LOWER(n.nspname) LIKE $1 OR 
                 LOWER(pg_catalog.pg_get_userbyid(n.nspowner)) LIKE $1 OR 
                 LOWER(pg_catalog.obj_description(n.oid, 'pg_namespace')) LIKE $1)
            """)
            params.append(search_term)
        if where_conditions:
            base_query += " AND " + " and ".join(where_conditions)
        count_query = f"""
            SELECT COUNT(*) as total
            FROM ({base_query}) as filtered_schemas
        """
        count_result = await self._execute_query(connection, count_query, *params)
        total_filtered = count_result[0]["total"] if count_result else 0
        total_query = """
            SELECT COUNT(*) as total
            FROM pg_catalog.pg_namespace n
            WHERE n.nspname NOT LIKE 'pg\_%'
              AND n.nspname != 'information_schema'
        """
        total_result = await self._execute_query(connection, total_query)
        total_all = total_result[0]["total"] if total_result else 0
        valid_sort_fields = {
            "name": "name",
            "owner": "owner",
            "oid": "oid",
            "size_bytes": "size_bytes",
            "table_count": "table_count"
        }
        sort_field = valid_sort_fields.get(sort_by, "name")
        sort_dir = "DESC" if sort_order.lower() == "desc" else "ASC"
        offset = (page - 1) * size
        limit = size
        paginated_query = f"""
            {base_query}
            ORDER BY {sort_field} {sort_dir}
            LIMIT ${len(params) + 1} OFFSET ${len(params) + 2}
        """
        params_with_pagination = params + [limit, offset]
        schemas = await self._execute_query(connection, paginated_query, *params_with_pagination)
        schemas_with_stats = []
        for schema in schemas:
            schema_stats = await self._get_schema_detailed_stats(connection, schema["oid"])
            tables = await self._get_tables_in_schema(connection, schema["oid"])
            schemas_with_stats.append({
                "oid": schema["oid"],
                "name": schema["name"],
                "owner": schema["owner"],
                "description": schema["description"],
                **schema_stats,
                "tables": tables
            })
        pages = math.ceil(total_filtered / size) if size > 0 and total_filtered > 0 else 1
        has_next = page < pages
        has_prev = page > 1
        return {
            "connection_id": connection_id,
            "connection_name": connection.name,
            "total_schemas": total_all,
            "total_filtered_schemas": total_filtered,
            "page": page,
            "size": size,
            "pages": pages,
            "has_next": has_next,
            "has_prev": has_prev,
            "schemas": schemas_with_stats
        }

    async def _get_schema_detailed_stats(self, connection: DB_Connection, schema_oid: int) -> Dict[str, Any]:
        """Получить детальную статистику для конкретной схемы"""
        size_query = """
            SELECT 
                COALESCE(SUM(pg_total_relation_size(c.oid)), 0) as size_bytes,
                pg_size_pretty(COALESCE(SUM(pg_total_relation_size(c.oid)), 0)) as size_pretty
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.oid = $1
              AND c.relkind IN ('r', 't', 'm', 'i')
        """
        size_result = await self._execute_query(connection, size_query, schema_oid)
        size_bytes = size_result[0]["size_bytes"] if size_result else 0
        size_pretty = size_result[0]["size_pretty"] if size_result else "0 bytes"
        tables_query = """
            SELECT COUNT(*) as count
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.oid = $1
              AND c.relkind = 'r'
              AND c.relpersistence = 'p'
        """
        tables_result = await self._execute_query(connection, tables_query, schema_oid)
        table_count = tables_result[0]["count"] if tables_result else 0
        temp_tables_query = """
            SELECT COUNT(*) as count
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.oid = $1
              AND c.relkind = 'r'
              AND c.relpersistence = 't'
        """
        temp_tables_result = await self._execute_query(connection, temp_tables_query, schema_oid)
        temp_table_count = temp_tables_result[0]["count"] if temp_tables_result else 0
        indexes_query = """
            SELECT COUNT(*) as count
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.oid = $1
              AND c.relkind = 'i'
        """
        indexes_result = await self._execute_query(connection, indexes_query, schema_oid)
        index_count = indexes_result[0]["count"] if indexes_result else 0
        views_query = """
            SELECT COUNT(*) as count
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.oid = $1
              AND c.relkind = 'v'
        """
        views_result = await self._execute_query(connection, views_query, schema_oid)
        view_count = views_result[0]["count"] if views_result else 0
        matviews_query = """
            SELECT COUNT(*) as count
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.oid = $1
              AND c.relkind = 'm'
        """
        matviews_result = await self._execute_query(connection, matviews_query, schema_oid)
        materialized_view_count = matviews_result[0]["count"] if matviews_result else 0
        procedures_query = """
            SELECT COUNT(*) as count
            FROM pg_proc p
            JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.oid = $1
              AND p.prokind = 'p'
        """
        procedures_result = await self._execute_query(connection, procedures_query, schema_oid)
        procedure_count = procedures_result[0]["count"] if procedures_result else 0
        functions_query = """
            SELECT COUNT(*) as count
            FROM pg_proc p
            JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.oid = $1
              AND p.prokind = 'f'
        """
        functions_result = await self._execute_query(connection, functions_query, schema_oid)
        function_count = functions_result[0]["count"] if functions_result else 0
        total_objects = (
                table_count + temp_table_count + index_count +
                view_count + materialized_view_count +
                procedure_count + function_count
        )
        return {
            "size_bytes": size_bytes,
            "size_pretty": size_pretty,
            "table_count": table_count,
            "temp_table_count": temp_table_count,
            "index_count": index_count,
            "view_count": view_count,
            "materialized_view_count": materialized_view_count,
            "procedure_count": procedure_count,
            "function_count": function_count,
            "total_objects": total_objects
        }

    async def _get_tables_in_schema(self, connection: DB_Connection, schema_oid: int) -> List[Dict[str, Any]]:
        """Получить список таблиц в схеме"""
        tables_query = """
            SELECT
                c.oid,
                c.relname as table_name,
                c.relkind as table_type_code,
                pg_catalog.pg_get_userbyid(c.relowner) as owner,
                pg_catalog.obj_description(c.oid, 'pg_class') as description,
                pg_catalog.pg_total_relation_size(c.oid) as size_bytes,
                pg_size_pretty(pg_catalog.pg_total_relation_size(c.oid)) as size_pretty,
                c.reltuples as estimated_row_count
            FROM pg_catalog.pg_class c
            WHERE c.relnamespace = $1
              AND c.relkind IN ('r', 'm', 'v', 'f', 'p')
            ORDER BY c.relname
        """
        rows = await self._execute_query(connection, tables_query, schema_oid)
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
        return tables
