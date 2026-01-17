# backend/services/db_schemas_services.py
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

    async def get_schemas_with_tables(self, connection_id: int, page: int = 1, size: int = 20, search: Optional[str] = None) -> Dict[str, Any]:
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
        all_schemas = [{"schema_name": row["schema_name"], "description": row["description"]} for row in all_schemas_rows]
        search_term = search.strip().lower() if search and search.strip() else None
        if not search_term:
            filtered_schemas = all_schemas
            total_schemas = len(all_schemas)
            total_filtered = total_schemas
        else:
            schemas_with_matching_tables = []
            for s in all_schemas:
                schema_name = s["schema_name"]
                schema_desc = (s["description"] or "").lower()
                schema_matches = search_term in schema_name.lower() or search_term in schema_desc
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
                        matching_tables.append({
                            "table_name": t["table_name"],
                            "table_description": t["table_description"]
                        })
                if schema_matches or matching_tables:
                    schemas_with_matching_tables.append({
                        "schema": s,
                        "matching_tables": matching_tables if not schema_matches else []
                    })
            filtered_schemas = []
            for item in schemas_with_matching_tables:
                s = item["schema"]
                if search_term in s["schema_name"].lower() or search_term in (s["description"] or "").lower():
                    filtered_schemas.append(s)
                else:
                    filtered_schemas.append(s)
            total_schemas = len(all_schemas)
            total_filtered = len(filtered_schemas)
        total_filtered = len(filtered_schemas)
        start = (page - 1) * size
        end = start + size
        paginated_schemas = filtered_schemas[start:end]
        schemas_with_tables = []
        for s in paginated_schemas:
            schema_name = s["schema_name"]
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
            """
            if search_term and not (search_term in schema_name.lower() or search_term in (s["description"] or "").lower()):
                all_tables_query = tables_query + " ORDER BY c.relname;"
                table_rows = await self._execute_query(connection, all_tables_query, schema_name)
                filtered_tables = []
                for tr in table_rows:
                    tbl_name = tr["table_name"].lower()
                    tbl_desc = (tr["description"] or "").lower()
                    if search_term in tbl_name or search_term in tbl_desc:
                        row_count = max(0, int(tr["row_count"])) if tr["row_count"] is not None else 0
                        size_bytes = tr["size_bytes"] or 0
                        size_pretty = self._human_readable_size(size_bytes)
                        filtered_tables.append({
                            "table_name": tr["table_name"],
                            "owner": tr["owner"],
                            "description": tr["description"],
                            "row_count": row_count,
                            "size_bytes": size_bytes,
                            "size_pretty": size_pretty,
                        })
                tables = filtered_tables
            else:
                table_rows = await self._execute_query(connection, tables_query + " ORDER BY c.relname;", schema_name)
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
            schemas_with_tables.append({"schema_name": schema_name, "description": s["description"], "tables": tables, })
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

    async def get_temporary_tables(self, connection_id: int, page: int = 1, size: int = 20, search: Optional[str] = None) -> Dict[str, Any]:
        """Получить список временных таблиц"""
        connection = await self._get_connection(connection_id)
        base_query = """
        SELECT
            c.relname AS table_name,
            pg_catalog.pg_get_userbyid(c.relowner) AS owner,
            pg_catalog.obj_description(c.oid, 'pg_class') AS description,
            c.reltuples::bigint AS row_count,
            pg_total_relation_size(c.oid) AS size_bytes
        FROM pg_catalog.pg_class c
        WHERE c.relpersistence = 't'
          AND c.relkind = 'r'
        """
        search_term = search.strip().lower() if search and search.strip() else None
        filtered_query = base_query
        count_query = f"SELECT COUNT(*) AS total FROM ({base_query}) AS sub"
        params = []
        if search_term:
            filtered_query += """
            AND (
                LOWER(c.relname) LIKE $1
                OR LOWER(pg_catalog.obj_description(c.oid, 'pg_class')) LIKE $1
            )
            """
            count_query = f"""
            SELECT COUNT(*) AS total FROM (
                {base_query}
                AND (
                    LOWER(c.relname) LIKE $1
                    OR LOWER(pg_catalog.obj_description(c.oid, 'pg_class')) LIKE $1
                )
            ) AS sub
            """
            params.append(f"%{search_term}%")
        total_all_query = "SELECT COUNT(*) AS total FROM pg_class WHERE relpersistence = 't' AND relkind = 'r'"
        total_all_res = await self._execute_query(connection, total_all_query)
        total_all = total_all_res[0]["total"] if total_all_res else 0
        total_filtered_res = await self._execute_query(connection, count_query, *params)
        total_filtered = total_filtered_res[0]["total"] if total_filtered_res else 0
        offset = (page - 1) * size
        paginated_query = f"""
        {filtered_query}
        ORDER BY c.relname
        LIMIT ${len(params) + 1} OFFSET ${len(params) + 2}
        """
        paginated_params = params + [size, offset]
        table_rows = await self._execute_query(connection, paginated_query, *paginated_params)
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
        pages = math.ceil(total_filtered / size) if size > 0 and total_filtered > 0 else 1
        has_next = page < pages
        has_prev = page > 1
        return {
            "connection_id": connection.id,
            "connection_name": connection.name,
            "total_temp_tables": total_all,
            "total_filtered_temp_tables": total_filtered,
            "page": page,
            "size": size,
            "pages": pages,
            "has_next": has_next,
            "has_prev": has_prev,
            "temporary_tables": tables,
        }

    def _human_readable_size(self, size_bytes: int) -> str:
        if size_bytes == 0:
            return "0 B"
        units = ["B", "KB", "MB", "GB", "TB"]
        i = 0
        size = float(size_bytes)
        while size >= 1024.0 and i < len(units) - 1:
            size /= 1024.0
            i += 1
        return f"{size:.1f} {units[i]}"

    # async def get_views(self, connection_id: int, page: int = 1, size: int = 20, search: Optional[str] = None) -> Dict[str, Any]:
    #     """Получить список представлений"""
    #     connection = await self._get_connection(connection_id)
    #     base_query = """
    #     SELECT
    #         schemaname AS schema_name,
    #         viewname AS view_name,
    #         definition,
    #         pg_catalog.obj_description(pgc.oid, 'pg_class') AS description
    #     FROM pg_catalog.pg_views v
    #     JOIN pg_catalog.pg_class pgc ON pgc.relname = v.viewname
    #     JOIN pg_catalog.pg_namespace pgn ON pgn.oid = pgc.relnamespace AND pgn.nspname = v.schemaname
    #     WHERE v.schemaname NOT IN ('pg_catalog', 'information_schema')
    #     """
    #     search_term = search.strip().lower() if search and search.strip() else None
    #     filtered_query = base_query
    #     count_query = f"SELECT COUNT(*) AS total FROM ({base_query}) AS sub"
    #     params = []
    #     if search_term:
    #         filtered_query += """
    #         AND (
    #             LOWER(v.viewname) LIKE $1
    #             OR LOWER(v.definition) LIKE $1
    #             OR LOWER(pg_catalog.obj_description(pgc.oid, 'pg_class')) LIKE $1
    #         )
    #         """
    #         count_query = f"""
    #         SELECT COUNT(*) AS total FROM (
    #             {base_query}
    #             AND (
    #                 LOWER(v.viewname) LIKE $1
    #                 OR LOWER(v.definition) LIKE $1
    #                 OR LOWER(pg_catalog.obj_description(pgc.oid, 'pg_class')) LIKE $1
    #             )
    #         ) AS sub
    #         """
    #         params.append(f"%{search_term}%")
    #     total_all_res = await self._execute_query(connection, f"SELECT COUNT(*) AS total FROM ({base_query}) AS sub")
    #     total_all = total_all_res[0]["total"] if total_all_res else 0
    #     total_filtered_res = await self._execute_query(connection, count_query, *params)
    #     total_filtered = total_filtered_res[0]["total"] if total_filtered_res else 0
    #     offset = (page - 1) * size
    #     paginated_query = f"""
    #     {filtered_query}
    #     ORDER BY v.schemaname, v.viewname
    #     LIMIT ${len(params) + 1} OFFSET ${len(params) + 2}
    #     """
    #     paginated_params = params + [size, offset]
    #     rows = await self._execute_query(connection, paginated_query, *paginated_params)
    #     views = []
    #     for row in rows:
    #         views.append({
    #             "schema_name": row["schema_name"],
    #             "view_name": row["view_name"],
    #             "description": row["description"],
    #             "definition": row["definition"],
    #         })
    #     pages = math.ceil(total_filtered / size) if size > 0 and total_filtered > 0 else 1
    #     has_next = page < pages
    #     has_prev = page > 1
    #     return {
    #         "connection_id": connection.id,
    #         "connection_name": connection.name,
    #         "total_views": total_all,
    #         "total_filtered_views": total_filtered,
    #         "page": page,
    #         "size": size,
    #         "pages": pages,
    #         "has_next": has_next,
    #         "has_prev": has_prev,
    #         "views": views,
    #     }
    #
    # async def get_materialized_views(self, connection_id: int, page: int = 1, size: int = 20, search: Optional[str] = None) -> Dict[str, Any]:
    #     """Получить список материализованных представлений"""
    #     connection = await self._get_connection(connection_id)
    #     base_query = """
    #     SELECT
    #         n.nspname AS schema_name,
    #         c.relname AS view_name,
    #         pg_catalog.obj_description(c.oid, 'pg_class') AS description,
    #         pg_get_viewdef(c.oid) AS definition
    #     FROM pg_catalog.pg_class c
    #     JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    #     WHERE c.relkind = 'm'
    #       AND n.nspname NOT IN ('pg_catalog', 'information_schema')
    #     """
    #     search_term = search.strip().lower() if search and search.strip() else None
    #     filtered_query = base_query
    #     count_query = f"SELECT COUNT(*) AS total FROM ({base_query}) AS sub"
    #     params = []
    #     if search_term:
    #         filtered_query += """
    #         AND (
    #             LOWER(c.relname) LIKE $1
    #             OR LOWER(n.nspname) LIKE $1
    #             OR LOWER(pg_catalog.obj_description(c.oid, 'pg_class')) LIKE $1
    #         )
    #         """
    #         count_query = f"""
    #         SELECT COUNT(*) AS total FROM (
    #             {base_query}
    #             AND (
    #                 LOWER(c.relname) LIKE $1
    #                 OR LOWER(n.nspname) LIKE $1
    #                 OR LOWER(pg_catalog.obj_description(c.oid, 'pg_class')) LIKE $1
    #             )
    #         ) AS sub
    #         """
    #         params.append(f"%{search_term}%")
    #     total_all_res = await self._execute_query(connection, f"SELECT COUNT(*) AS total FROM ({base_query}) AS sub")
    #     total_all = total_all_res[0]["total"] if total_all_res else 0
    #     total_filtered_res = await self._execute_query(connection, count_query, *params)
    #     total_filtered = total_filtered_res[0]["total"] if total_filtered_res else 0
    #     offset = (page - 1) * size
    #     paginated_query = f"""
    #     {filtered_query}
    #     ORDER BY n.nspname, c.relname
    #     LIMIT ${len(params) + 1} OFFSET ${len(params) + 2}
    #     """
    #     paginated_params = params + [size, offset]
    #     rows = await self._execute_query(connection, paginated_query, *paginated_params)
    #     materialized_views = []
    #     for row in rows:
    #         definition = (row["definition"] or "").replace("\\n", "\n")
    #         materialized_views.append({
    #             "schema_name": row["schema_name"],
    #             "view_name": row["view_name"],
    #             "description": row["description"],
    #             "definition": definition,
    #         })
    #     pages = math.ceil(total_filtered / size) if size > 0 and total_filtered > 0 else 1
    #     has_next = page < pages
    #     has_prev = page > 1
    #     return {
    #         "connection_id": connection.id,
    #         "connection_name": connection.name,
    #         "total_materialized_views": total_all,
    #         "total_filtered_materialized_views": total_filtered,
    #         "page": page,
    #         "size": size,
    #         "pages": pages,
    #         "has_next": has_next,
    #         "has_prev": has_prev,
    #         "materialized_views": materialized_views,
    #     }

    # async def get_functions(self, connection_id: int, page: int = 1, size: int = 20, search: Optional[str] = None) -> Dict[str, Any]:
    #     """Получить список функций"""
    #     connection = await self._get_connection(connection_id)
    #     base_query = """
    #     SELECT
    #         n.nspname AS schema_name,
    #         p.proname AS function_name,
    #         pg_catalog.obj_description(p.oid, 'pg_proc') AS description,
    #         pg_get_functiondef(p.oid) AS definition
    #     FROM pg_catalog.pg_proc p
    #     JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    #     WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
    #     """
    #     search_term = search.strip().lower() if search and search.strip() else None
    #     filtered_query = base_query
    #     count_query = f"SELECT COUNT(*) AS total FROM ({base_query}) AS sub"
    #     params = []
    #     if search_term:
    #         filtered_query += """
    #         AND (
    #             LOWER(p.proname) LIKE $1
    #             OR LOWER(n.nspname) LIKE $1
    #             OR LOWER(pg_catalog.obj_description(p.oid, 'pg_proc')) LIKE $1
    #         )
    #         """
    #         count_query = f"""
    #         SELECT COUNT(*) AS total FROM (
    #             {base_query}
    #             AND (
    #                 LOWER(p.proname) LIKE $1
    #                 OR LOWER(n.nspname) LIKE $1
    #                 OR LOWER(pg_catalog.obj_description(p.oid, 'pg_proc')) LIKE $1
    #             )
    #         ) AS sub
    #         """
    #         params.append(f"%{search_term}%")
    #     total_all_res = await self._execute_query(connection, f"SELECT COUNT(*) AS total FROM ({base_query}) AS sub")
    #     total_all = total_all_res[0]["total"] if total_all_res else 0
    #     total_filtered_res = await self._execute_query(connection, count_query, *params)
    #     total_filtered = total_filtered_res[0]["total"] if total_filtered_res else 0
    #     offset = (page - 1) * size
    #     paginated_query = f"""
    #     {filtered_query}
    #     ORDER BY n.nspname, p.proname
    #     LIMIT ${len(params) + 1} OFFSET ${len(params) + 2}
    #     """
    #     paginated_params = params + [size, offset]
    #     rows = await self._execute_query(connection, paginated_query, *paginated_params)
    #     functions = []
    #     for row in rows:
    #         definition = (row["definition"] or "").replace("\\n", "\n")
    #         functions.append({
    #             "schema_name": row["schema_name"],
    #             "function_name": row["function_name"],
    #             "description": row["description"],
    #             "definition": definition,
    #         })
    #     pages = math.ceil(total_filtered / size) if size > 0 and total_filtered > 0 else 1
    #     has_next = page < pages
    #     has_prev = page > 1
    #     return {
    #         "connection_id": connection.id,
    #         "connection_name": connection.name,
    #         "total_functions": total_all,
    #         "total_filtered_functions": total_filtered,
    #         "page": page,
    #         "size": size,
    #         "pages": pages,
    #         "has_next": has_next,
    #         "has_prev": has_prev,
    #         "functions": functions,
    #     }

    async def get_indexes(self, connection_id: int, page: int = 1, size: int = 20, search: Optional[str] = None) -> Dict[str, Any]:
        """Получить список индексов из подключённой БД."""
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
        total_all_res = await self._execute_query(connection, f"SELECT COUNT(*) AS total FROM ({base_query}) AS sub")
        total_all = total_all_res[0]["total"] if total_all_res else 0
        total_filtered_res = await self._execute_query(connection, count_query, *params)
        total_filtered = total_filtered_res[0]["total"] if total_filtered_res else 0
        offset = (page - 1) * size
        paginated_query = f"""
        {filtered_query}
        ORDER BY n.nspname, t.relname, i.relname
        LIMIT ${len(params) + 1} OFFSET ${len(params) + 2}
        """
        paginated_params = params + [size, offset]
        rows = await self._execute_query(connection, paginated_query, *paginated_params)
        indexes = []
        for row in rows:
            definition = (row["definition"] or "").replace("\\n", "\n")
            indexes.append({
                "schema_name": row["schema_name"],
                "index_name": row["index_name"],
                "table_name": row["table_name"],
                "description": row["description"],
                "definition": definition,
            })
        pages = math.ceil(total_filtered / size) if size > 0 and total_filtered > 0 else 1
        has_next = page < pages
        has_prev = page > 1
        return {
            "connection_id": connection.id,
            "connection_name": connection.name,
            "total_indexes": total_all,
            "total_filtered_indexes": total_filtered,
            "page": page,
            "size": size,
            "pages": pages,
            "has_next": has_next,
            "has_prev": has_prev,
            "indexes": indexes,
        }

    async def get_schema_privileges_for_users(self, connection_id: int, page: int = 1, size: int = 20, search: Optional[str] = None) -> Dict[str, Any]:
        connection = await self._get_connection(connection_id)
        users_query = "SELECT oid, rolname FROM pg_roles WHERE rolcanlogin = true ORDER BY rolname;"
        user_rows = await self._execute_query(connection, users_query)
        user_oids = {row["oid"] for row in user_rows}
        oid_to_rolname = {row["oid"]: row["rolname"] for row in user_rows}
        all_usernames = sorted(oid_to_rolname.values())
        all_schemas_query = """
        SELECT
            nspname AS schema_name,
            pg_get_userbyid(nspowner) AS owner,
            pg_catalog.obj_description(oid, 'pg_namespace') AS description
        FROM pg_catalog.pg_namespace
        WHERE nspname NOT LIKE 'pg_%'
          AND nspname != 'information_schema'
        ORDER BY nspname;
        """
        all_schemas_rows = await self._execute_query(connection, all_schemas_query)
        all_schemas = {
            row["schema_name"]: {
                "owner": row["owner"],
                "description": row["description"],
                "privileges": {
                    username: {"CREATE": False, "USAGE": False}
                    for username in all_usernames
                }
            }
            for row in all_schemas_rows
        }
        privileges_query = """
        SELECT
            nspname AS schema_name,
            (aclexplode(nspacl)).grantee AS grantee_oid,
            (aclexplode(nspacl)).privilege_type
        FROM pg_catalog.pg_namespace
        WHERE nspname NOT LIKE 'pg_%'
          AND nspname != 'information_schema'
          AND nspacl IS NOT NULL;
        """
        privilege_rows = await self._execute_query(connection, privileges_query)
        for row in privilege_rows:
            schema = row["schema_name"]
            grantee_oid = row["grantee_oid"]
            privilege = row["privilege_type"]
            if grantee_oid not in user_oids or privilege not in ("CREATE", "USAGE"):
                continue
            username = oid_to_rolname[grantee_oid]
            if schema in all_schemas and username in all_schemas[schema]["privileges"]:
                all_schemas[schema]["privileges"][username][privilege] = True
        all_entries = []
        for name, info in all_schemas.items():
            schema_entry = {
                "schema_name": name,
                "owner": info["owner"],
                "description": info["description"],
                "role_privileges": [
                    {
                        "role": user,
                        "create": priv["CREATE"],
                        "usage": priv["USAGE"]
                    }
                    for user, priv in info["privileges"].items()
                ]
            }
            all_entries.append(schema_entry)
        search_term = search.strip().lower() if search and search.strip() else None
        filtered_entries = []
        if not search_term:
            filtered_entries = all_entries
        else:
            for entry in all_entries:
                matches_schema = (
                        search_term in entry["schema_name"].lower() or
                        (entry["description"] and search_term in entry["description"].lower()) or
                        search_term in entry["owner"].lower()
                )
                if matches_schema:
                    filtered_entries.append(entry)
                    continue
                matching_roles = [
                    rp for rp in entry["role_privileges"]
                    if search_term in rp["role"].lower()
                ]
                if matching_roles:
                    entry_copy = entry.copy()
                    entry_copy["role_privileges"] = matching_roles
                    filtered_entries.append(entry_copy)
        total_schemas = len(all_entries)
        total_filtered = len(filtered_entries)
        start = (page - 1) * size
        end = start + size
        paginated = filtered_entries[start:end]
        pages = (total_filtered + size - 1) // size if size > 0 else 1
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
            "schema_privileges": paginated,
        }

    async def update_schema_privileges_for_users(self, connection_id: int, schema_name: str, user_privileges: List[Dict[str, Any]], ) -> List[str]:
        connection = await self._get_connection(connection_id)
        check_schema_query = "SELECT 1 FROM pg_namespace WHERE nspname = $1;"
        exists = await self._execute_query(connection, check_schema_query, schema_name)
        if not exists:
            raise ValueError(f"Схема '{schema_name}' не существует.")
        users_query = "SELECT rolname FROM pg_roles WHERE rolcanlogin = true;"
        valid_users = {row["rolname"] for row in await self._execute_query(connection, users_query)}
        updated_users = []
        for item in user_privileges:
            username = item["username"]
            create = item["create"]
            usage = item["usage"]
            if username not in valid_users:
                raise ValueError(f"Пользователь '{username}' не существует или не является логин-ролью.")
            updated_users.append(username)
            if '"' in schema_name or '"' in username:
                raise ValueError("Имя схемы или пользователя не должно содержать кавычки")
            if usage:
                await self._execute_query(connection, f'GRANT USAGE ON SCHEMA "{schema_name}" TO "{username}";')
            else:
                await self._execute_query(connection, f'REVOKE USAGE ON SCHEMA "{schema_name}" FROM "{username}";')
            if create:
                await self._execute_query(connection, f'GRANT CREATE ON SCHEMA "{schema_name}" TO "{username}";')
            else:
                await self._execute_query(connection, f'REVOKE CREATE ON SCHEMA "{schema_name}" FROM "{username}";')
        return updated_users

    async def get_schema_privileges_for_groups(self, connection_id: int, page: int = 1, size: int = 20, search: Optional[str] = None) -> Dict[str, Any]:
        connection = await self._get_connection(connection_id)
        groups_query = "SELECT oid, rolname FROM pg_roles WHERE rolcanlogin = false ORDER BY rolname;"
        group_rows = await self._execute_query(connection, groups_query)
        group_oids = {row["oid"] for row in group_rows}
        oid_to_rolname = {row["oid"]: row["rolname"] for row in group_rows}
        all_groupnames = sorted(oid_to_rolname.values())
        all_schemas_query = """
        SELECT
            nspname AS schema_name,
            pg_get_userbyid(nspowner) AS owner,
            pg_catalog.obj_description(oid, 'pg_namespace') AS description
        FROM pg_catalog.pg_namespace
        WHERE nspname NOT LIKE 'pg_%'
          AND nspname != 'information_schema'
        ORDER BY nspname;
        """
        all_schemas_rows = await self._execute_query(connection, all_schemas_query)
        all_schemas = {
            row["schema_name"]: {
                "owner": row["owner"],
                "description": row["description"],
                "privileges": {
                    groupname: {"CREATE": False, "USAGE": False}
                    for groupname in all_groupnames
                }
            }
            for row in all_schemas_rows
        }
        privileges_query = """
        SELECT
            nspname AS schema_name,
            (aclexplode(nspacl)).grantee AS grantee_oid,
            (aclexplode(nspacl)).privilege_type
        FROM pg_catalog.pg_namespace
        WHERE nspname NOT LIKE 'pg_%'
          AND nspname != 'information_schema'
          AND nspacl IS NOT NULL;
        """
        privilege_rows = await self._execute_query(connection, privileges_query)
        for row in privilege_rows:
            schema = row["schema_name"]
            grantee_oid = row["grantee_oid"]
            privilege = row["privilege_type"]
            if grantee_oid not in group_oids or privilege not in ("CREATE", "USAGE"):
                continue
            groupname = oid_to_rolname[grantee_oid]
            if schema in all_schemas and groupname in all_schemas[schema]["privileges"]:
                all_schemas[schema]["privileges"][groupname][privilege] = True
        all_entries = []
        for name, info in all_schemas.items():
            schema_entry = {
                "schema_name": name,
                "owner": info["owner"],
                "description": info["description"],
                "role_privileges": [
                    {
                        "role": group,
                        "create": priv["CREATE"],
                        "usage": priv["USAGE"]
                    }
                    for group, priv in info["privileges"].items()
                ]
            }
            all_entries.append(schema_entry)
        search_term = search.strip().lower() if search and search.strip() else None
        filtered_entries = []
        if not search_term:
            filtered_entries = all_entries
        else:
            for entry in all_entries:
                matches_schema = (
                        search_term in entry["schema_name"].lower() or
                        (entry["description"] and search_term in entry["description"].lower()) or
                        search_term in entry["owner"].lower()
                )
                if matches_schema:
                    filtered_entries.append(entry)
                    continue
                matching_roles = [
                    rp for rp in entry["role_privileges"]
                    if search_term in rp["role"].lower()
                ]
                if matching_roles:
                    entry_copy = entry.copy()
                    entry_copy["role_privileges"] = matching_roles
                    filtered_entries.append(entry_copy)
        total_schemas = len(all_entries)
        total_filtered = len(filtered_entries)
        start = (page - 1) * size
        end = start + size
        paginated = filtered_entries[start:end]
        pages = (total_filtered + size - 1) // size if size > 0 else 1
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
            "schema_privileges": paginated,
        }

    async def update_schema_privileges_for_groups(self, connection_id: int, schema_name: str, group_privileges: List[Dict[str, Any]], ) -> List[str]:
        """Обновить права CREATE/USAGE на схему для групп"""
        connection = await self._get_connection(connection_id)
        exists = await self._execute_query(connection, "SELECT 1 FROM pg_namespace WHERE nspname = $1", schema_name)
        if not exists:
            raise ValueError(f"Схема '{schema_name}' не существует.")
        groups_query = "SELECT rolname FROM pg_roles WHERE rolcanlogin = false;"
        valid_groups = {row["rolname"] for row in await self._execute_query(connection, groups_query)}
        updated_groups = []
        for item in group_privileges:
            groupname = item["groupname"]
            create = item["create"]
            usage = item["usage"]
            if groupname not in valid_groups:
                raise ValueError(f"Группа '{groupname}' не существует или не является группой (ожидается rolcanlogin = false).")
            updated_groups.append(groupname)
            if '"' in schema_name or '"' in groupname:
                raise ValueError("Имя схемы или группы не должно содержать кавычки")
            if usage:
                await self._execute_query(connection, f'GRANT USAGE ON SCHEMA "{schema_name}" TO "{groupname}";')
            else:
                await self._execute_query(connection, f'REVOKE USAGE ON SCHEMA "{schema_name}" FROM "{groupname}";')
            if create:
                await self._execute_query(connection, f'GRANT CREATE ON SCHEMA "{schema_name}" TO "{groupname}";')
            else:
                await self._execute_query(connection, f'REVOKE CREATE ON SCHEMA "{schema_name}" FROM "{groupname}";')
        return updated_groups

    async def get_table_privileges_for_users(self, connection_id: int, page: int = 1, size: int = 20, search: Optional[str] = None) -> Dict[str, Any]:
        connection = await self._get_connection(connection_id)
        users_query = "SELECT oid, rolname FROM pg_roles WHERE rolcanlogin = true ORDER BY rolname;"
        user_rows = await self._execute_query(connection, users_query)
        user_oids = {row["oid"] for row in user_rows}
        oid_to_rolname = {row["oid"]: row["rolname"] for row in user_rows}
        all_usernames = sorted(oid_to_rolname.values())
        tables_query = """
        SELECT
            n.nspname AS schema_name,
            c.relname AS table_name,
            c.oid AS table_oid,
            pg_get_userbyid(c.relowner) AS owner
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'r'
          AND n.nspname NOT LIKE 'pg_%'
          AND n.nspname != 'information_schema'
        ORDER BY n.nspname, c.relname;
        """
        table_rows = await self._execute_query(connection, tables_query)
        table_info = {
            row["table_oid"]: {
                "schema_name": row["schema_name"],
                "table_name": row["table_name"],
                "owner": row["owner"],
                "privileges": {
                    username: {
                        "SELECT": False, "INSERT": False, "UPDATE": False,
                        "DELETE": False, "TRUNCATE": False
                    }
                    for username in all_usernames
                }
            }
            for row in table_rows
        }
        acl_query = """
        SELECT
            c.oid AS table_oid,
            (aclexplode(c.relacl)).grantee AS grantee_oid,
            (aclexplode(c.relacl)).privilege_type
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'r'
          AND n.nspname NOT LIKE 'pg_%'
          AND n.nspname != 'information_schema'
          AND c.relacl IS NOT NULL;
        """
        acl_rows = await self._execute_query(connection, acl_query)
        target_privileges = {"SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE"}
        for row in acl_rows:
            table_oid = row["table_oid"]
            grantee_oid = row["grantee_oid"]
            privilege = row["privilege_type"]
            if grantee_oid not in user_oids or privilege not in target_privileges:
                continue
            username = oid_to_rolname[grantee_oid]
            if table_oid in table_info and username in table_info[table_oid]["privileges"]:
                table_info[table_oid]["privileges"][username][privilege] = True
        all_entries = []
        for info in table_info.values():
            entry = {
                "schema_name": info["schema_name"],
                "table_name": info["table_name"],
                "owner": info["owner"],
                "user_privileges": [
                    {
                        "user": user,
                        "select": priv["SELECT"],
                        "insert": priv["INSERT"],
                        "update": priv["UPDATE"],
                        "delete": priv["DELETE"],
                        "truncate": priv["TRUNCATE"],
                    }
                    for user, priv in info["privileges"].items()
                ]
            }
            all_entries.append(entry)
        search_term = search.strip().lower() if search and search.strip() else None
        filtered_entries = []
        if not search_term:
            filtered_entries = all_entries
        else:
            for entry in all_entries:
                matches_table = (
                        search_term in entry["schema_name"].lower() or
                        search_term in entry["table_name"].lower() or
                        search_term in entry["owner"].lower()
                )
                if matches_table:
                    filtered_entries.append(entry)
                    continue
                matching_users = [
                    up for up in entry["user_privileges"]
                    if search_term in up["user"].lower()
                ]
                if matching_users:
                    entry_copy = entry.copy()
                    entry_copy["user_privileges"] = matching_users
                    filtered_entries.append(entry_copy)
        total_tables = len(all_entries)
        total_filtered = len(filtered_entries)
        start = (page - 1) * size
        end = start + size
        paginated = filtered_entries[start:end]
        pages = (total_filtered + size - 1) // size if size > 0 else 1
        has_next = page < pages
        has_prev = page > 1
        return {
            "connection_id": connection.id,
            "connection_name": connection.name,
            "total_tables": total_tables,
            "total_filtered_tables": total_filtered,
            "page": page,
            "size": size,
            "pages": pages,
            "has_next": has_next,
            "has_prev": has_prev,
            "table_privileges": paginated,
        }

    async def update_table_privileges_for_users(self, connection_id: int, schema_name: str, table_name: str, user_privileges: List[Dict[str, Any]], ) -> List[str]:
        """Обновляет права SELECT, INSERT, UPDATE, DELETE, TRUNCATE на таблицу для указанных пользователей."""
        connection = await self._get_connection(connection_id)
        exists = await self._execute_query(connection, "SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = $1 AND c.relname = $2 AND c.relkind = 'r';", schema_name, table_name)
        if not exists:
            raise ValueError(f"Таблица '{table_name}' в схеме '{schema_name}' не существует.")
        users_query = "SELECT rolname FROM pg_roles WHERE rolcanlogin = true;"
        valid_users = {row["rolname"] for row in await self._execute_query(connection, users_query)}
        updated_users = []
        for item in user_privileges:
            username = item["username"]
            if username not in valid_users:
                raise ValueError(f"Пользователь '{username}' не существует или не является логин-ролью.")
            updated_users.append(username)
            if '"' in schema_name or '"' in table_name or '"' in username:
                raise ValueError("Имена схемы, таблицы или пользователя не должны содержать кавычки")
            target_privileges = ["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE"]
            current_privs = set()
            acl_rows = await self._execute_query(
                connection,
                """
                SELECT (aclexplode(relacl)).grantee AS grantee_oid,
                       (aclexplode(relacl)).privilege_type
                FROM pg_class c
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE n.nspname = $1 AND c.relname = $2 AND c.relkind = 'r';
                """,
                schema_name,
                table_name
            )
            user_oid = await self._execute_query(connection, "SELECT oid FROM pg_roles WHERE rolname = $1", username)
            if not user_oid:
                continue
            user_oid = user_oid[0]["oid"]
            for row in acl_rows:
                if row["grantee_oid"] == user_oid:
                    current_privs.add(row["privilege_type"])
            for priv in target_privileges:
                desired = item[priv.lower()]
                current = priv in current_privs
                if desired and not current:
                    await self._execute_query(connection, f'GRANT {priv} ON TABLE "{schema_name}"."{table_name}" TO "{username}";')
                elif not desired and current:
                    await self._execute_query(connection, f'REVOKE {priv} ON TABLE "{schema_name}"."{table_name}" FROM "{username}";')
        return updated_users

    async def get_table_privileges_for_groups(self, connection_id: int, page: int = 1, size: int = 20, search: Optional[str] = None) -> Dict[str, Any]:
        connection = await self._get_connection(connection_id)
        groups_query = "SELECT oid, rolname FROM pg_roles WHERE rolcanlogin = false ORDER BY rolname;"
        group_rows = await self._execute_query(connection, groups_query)
        group_oids = {row["oid"] for row in group_rows}
        oid_to_rolname = {row["oid"]: row["rolname"] for row in group_rows}
        all_groupnames = sorted(oid_to_rolname.values())

        tables_query = """
        SELECT
            n.nspname AS schema_name,
            c.relname AS table_name,
            c.oid AS table_oid,
            pg_get_userbyid(c.relowner) AS owner
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'r'
          AND n.nspname NOT LIKE 'pg_%'
          AND n.nspname != 'information_schema'
        ORDER BY n.nspname, c.relname;
        """
        table_rows = await self._execute_query(connection, tables_query)
        table_info = {
            row["table_oid"]: {
                "schema_name": row["schema_name"],
                "table_name": row["table_name"],
                "owner": row["owner"],
                "privileges": {
                    groupname: {
                        "SELECT": False, "INSERT": False, "UPDATE": False,
                        "DELETE": False, "TRUNCATE": False
                    }
                    for groupname in all_groupnames
                }
            }
            for row in table_rows
        }

        acl_query = """
        SELECT
            c.oid AS table_oid,
            (aclexplode(c.relacl)).grantee AS grantee_oid,
            (aclexplode(c.relacl)).privilege_type
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'r'
          AND n.nspname NOT LIKE 'pg_%'
          AND n.nspname != 'information_schema'
          AND c.relacl IS NOT NULL;
        """
        acl_rows = await self._execute_query(connection, acl_query)
        target_privileges = {"SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE"}

        for row in acl_rows:
            table_oid = row["table_oid"]
            grantee_oid = row["grantee_oid"]
            privilege = row["privilege_type"]

            # Пропускаем PUBLIC (OID=0) и неизвестные OID
            if grantee_oid == 0 or grantee_oid not in oid_to_rolname:
                continue

            if grantee_oid not in group_oids or privilege not in target_privileges:
                continue

            groupname = oid_to_rolname[grantee_oid]
            if table_oid in table_info and groupname in table_info[table_oid]["privileges"]:
                table_info[table_oid]["privileges"][groupname][privilege] = True

        all_entries = []
        for info in table_info.values():
            entry = {
                "schema_name": info["schema_name"],
                "table_name": info["table_name"],
                "owner": info["owner"],
                "group_privileges": [
                    {
                        "group": group,
                        "select": priv["SELECT"],
                        "insert": priv["INSERT"],
                        "update": priv["UPDATE"],
                        "delete": priv["DELETE"],
                        "truncate": priv["TRUNCATE"],
                    }
                    for group, priv in info["privileges"].items()
                ]
            }
            all_entries.append(entry)

        search_term = search.strip().lower() if search and search.strip() else None
        filtered_entries = []
        if not search_term:
            filtered_entries = all_entries
        else:
            for entry in all_entries:
                matches_table = (
                        search_term in entry["schema_name"].lower() or
                        search_term in entry["table_name"].lower() or
                        search_term in entry["owner"].lower()
                )
                if matches_table:
                    filtered_entries.append(entry)
                    continue
                matching_groups = [
                    gp for gp in entry["group_privileges"]
                    if search_term in gp["group"].lower()
                ]
                if matching_groups:
                    entry_copy = entry.copy()
                    entry_copy["group_privileges"] = matching_groups
                    filtered_entries.append(entry_copy)

        total_tables = len(all_entries)
        total_filtered = len(filtered_entries)
        start = (page - 1) * size
        end = start + size
        paginated = filtered_entries[start:end]

        pages = (total_filtered + size - 1) // size if size > 0 else 1
        has_next = page < pages
        has_prev = page > 1

        return {
            "connection_id": connection.id,
            "connection_name": connection.name,
            "total_tables": total_tables,
            "total_filtered_tables": total_filtered,
            "page": page,
            "size": size,
            "pages": pages,
            "has_next": has_next,
            "has_prev": has_prev,
            "table_privileges": paginated,
        }
    async def update_table_privileges_for_groups(self, connection_id: int, schema_name: str, table_name: str, group_privileges: List[Dict[str, Any]], ) -> List[str]:
        connection = await self._get_connection(connection_id)
        exists = await self._execute_query(
            connection,
            "SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace "
            "WHERE n.nspname = $1 AND c.relname = $2 AND c.relkind = 'r';",
            schema_name,
            table_name
        )
        if not exists:
            raise ValueError(f"Таблица '{table_name}' в схеме '{schema_name}' не существует.")
        groups_query = "SELECT rolname FROM pg_roles WHERE rolcanlogin = false;"
        valid_groups = {row["rolname"] for row in await self._execute_query(connection, groups_query)}
        updated_groups = []
        target_privileges = ["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE"]
        for item in group_privileges:
            groupname = item["groupname"]
            if groupname not in valid_groups:
                raise ValueError(f"Группа '{groupname}' не существует или не является группой.")
            if '"' in schema_name or '"' in table_name or '"' in groupname:
                raise ValueError("Имена не должны содержать кавычки")
            updated_groups.append(groupname)
            current_privs = set()
            acl_rows = await self._execute_query(
                connection,
                """
                SELECT (aclexplode(relacl)).grantee AS grantee_oid,
                       (aclexplode(relacl)).privilege_type
                FROM pg_class c
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE n.nspname = $1 AND c.relname = $2 AND c.relkind = 'r';
                """,
                schema_name,
                table_name
            )
            group_oid = await self._execute_query(connection, "SELECT oid FROM pg_roles WHERE rolname = $1", groupname)
            if not group_oid:
                continue
            group_oid = group_oid[0]["oid"]
            for row in acl_rows:
                if row["grantee_oid"] == group_oid:
                    current_privs.add(row["privilege_type"])
            for priv in target_privileges:
                desired = item[priv.lower()]
                current = priv in current_privs
                if desired and not current:
                    await self._execute_query(
                        connection,
                        f'GRANT {priv} ON TABLE "{schema_name}"."{table_name}" TO "{groupname}";'
                    )
                elif not desired and current:
                    await self._execute_query(
                        connection,
                        f'REVOKE {priv} ON TABLE "{schema_name}"."{table_name}" FROM "{groupname}";'
                    )
        return updated_groups

    async def get_table_privileges_for_selected_groups(
            self,
            connection_id: int,
            group_names: List[str],
            page: int = 1,
            size: int = 20,
            search: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Возвращает все таблицы и привилегии только для указанных групп.
        """
        connection = await self._get_connection(connection_id)

        # Проверяем, что все указанные группы существуют как группы (rolcanlogin = false)
        all_groups_query = "SELECT rolname FROM pg_roles WHERE rolcanlogin = false;"
        valid_groups = {row["rolname"] for row in await self._execute_query(connection, all_groups_query)}
        requested_groups = set(group_names)
        invalid_groups = requested_groups - valid_groups
        if invalid_groups:
            raise ValueError(f"Следующие имена не являются группами: {sorted(invalid_groups)}")

        # Получаем все таблицы
        tables_query = """
        SELECT
            n.nspname AS schema_name,
            c.relname AS table_name,
            c.oid AS table_oid,
            pg_get_userbyid(c.relowner) AS owner
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'r'
          AND n.nspname NOT LIKE 'pg_%'
          AND n.nspname != 'information_schema'
        ORDER BY n.nspname, c.relname;
        """
        table_rows = await self._execute_query(connection, tables_query)
        table_info = {
            row["table_oid"]: {
                "schema_name": row["schema_name"],
                "table_name": row["table_name"],
                "owner": row["owner"],
                "privileges": {
                    group: {"SELECT": False, "INSERT": False, "UPDATE": False, "DELETE": False, "TRUNCATE": False}
                    for group in requested_groups
                }
            }
            for row in table_rows
        }

        # Получаем ACL
        acl_query = """
        SELECT
            c.oid AS table_oid,
            (aclexplode(c.relacl)).grantee AS grantee_oid,
            (aclexplode(c.relacl)).privilege_type
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'r'
          AND n.nspname NOT LIKE 'pg_%'
          AND n.nspname != 'information_schema'
          AND c.relacl IS NOT NULL;
        """
        acl_rows = await self._execute_query(connection, acl_query)
        target_privileges = {"SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE"}

        # Получаем OID для запрошенных групп
        if not requested_groups:
            oid_map = {}
        else:
            placeholders = ", ".join(f"${i + 1}" for i in range(len(requested_groups)))
            oids_query = f"SELECT oid, rolname FROM pg_roles WHERE rolname IN ({placeholders}) AND rolcanlogin = false;"
            oid_rows = await self._execute_query(connection, oids_query, *sorted(requested_groups))
            oid_map = {row["oid"]: row["rolname"] for row in oid_rows}

        for row in acl_rows:
            table_oid = row["table_oid"]
            grantee_oid = row["grantee_oid"]
            privilege = row["privilege_type"]
            if grantee_oid not in oid_map or privilege not in target_privileges:
                continue
            groupname = oid_map[grantee_oid]
            if table_oid in table_info and groupname in table_info[table_oid]["privileges"]:
                table_info[table_oid]["privileges"][groupname][privilege] = True

        # Формируем записи
        all_entries = []
        for info in table_info.values():
            entry = {
                "schema_name": info["schema_name"],
                "table_name": info["table_name"],
                "owner": info["owner"],
                "group_privileges": [
                    {
                        "group": group,
                        "select": priv["SELECT"],
                        "insert": priv["INSERT"],
                        "update": priv["UPDATE"],
                        "delete": priv["DELETE"],
                        "truncate": priv["TRUNCATE"],
                    }
                    for group, priv in info["privileges"].items()
                ]
            }
            all_entries.append(entry)

        # Поиск
        search_term = search.strip().lower() if search and search.strip() else None
        filtered_entries = []
        if not search_term:
            filtered_entries = all_entries
        else:
            for entry in all_entries:
                matches_table = (
                        search_term in entry["schema_name"].lower() or
                        search_term in entry["table_name"].lower() or
                        search_term in entry["owner"].lower()
                )
                if matches_table:
                    filtered_entries.append(entry)
                    continue
                matching_groups = [
                    gp for gp in entry["group_privileges"]
                    if search_term in gp["group"].lower()
                ]
                if matching_groups:
                    entry_copy = entry.copy()
                    entry_copy["group_privileges"] = matching_groups
                    filtered_entries.append(entry_copy)

        total_tables = len(all_entries)
        total_filtered = len(filtered_entries)

        start = (page - 1) * size
        end = start + size
        paginated = filtered_entries[start:end]
        pages = (total_filtered + size - 1) // size if size > 0 else 1
        has_next = page < pages
        has_prev = page > 1

        return {
            "connection_id": connection.id,
            "connection_name": connection.name,
            "requested_groups": sorted(requested_groups),
            "total_tables": total_tables,
            "total_filtered_tables": total_filtered,
            "page": page,
            "size": size,
            "pages": pages,
            "has_next": has_next,
            "has_prev": has_prev,
            "table_privileges": paginated,
        }