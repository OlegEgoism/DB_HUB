# backend/services/db_tables_services.py
from typing import Any, Literal

from asyncpg.utils import _quote_ident
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.db import DB_Connection
from backend.utils.external_db import external_db_connection, get_db_connection_by_id
from backend.utils.pagination import calculate_pagination_info


class DBTablesService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_connection(self, connection_id: int) -> DB_Connection:
        connection = await get_db_connection_by_id(self.db, connection_id)
        if not connection:
            raise ValueError(f"Подключение с id {connection_id} не найдено")
        return connection

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

    async def get_tables(
        self,
        connection_id: int,
        page: int = 1,
        size: int = 20,
        search: str | None = None,
    ) -> dict[str, Any]:
        connection = await self._get_connection(connection_id)
        schemas_query = """
        SELECT
        n.nspname AS schema_name,
        pg_catalog.obj_description(n.oid, 'pg_namespace') AS description,
        COUNT(c.oid) AS table_count
        FROM pg_catalog.pg_namespace n
        LEFT JOIN pg_catalog.pg_class c ON n.oid = c.relnamespace AND c.relkind = 'r'
        WHERE n.nspname NOT LIKE 'pg_%'
        AND n.nspname != 'information_schema'
        GROUP BY n.nspname, n.oid
        """
        params = []
        search_term = search.strip().lower() if search and search.strip() else None
        if search_term:
            schemas_query += """
            HAVING (
            LOWER(n.nspname) LIKE $1
            OR LOWER(pg_catalog.obj_description(n.oid, 'pg_namespace')) LIKE $1
            )
            """
            params.append(f"%{search_term}%")
        schemas_query += " ORDER BY n.nspname"
        async with external_db_connection(connection) as conn:
            count_query = """
            SELECT COUNT(*) AS total FROM (
            SELECT n.nspname
            FROM pg_catalog.pg_namespace n
            WHERE n.nspname NOT LIKE 'pg_%'
            AND n.nspname != 'information_schema'
            ) AS sub
            """
            total_all_row = await conn.fetchrow(count_query)
            total_all = total_all_row["total"] if total_all_row else 0
            offset = (page - 1) * size
            paginated_query = f"{schemas_query} LIMIT {size} OFFSET {offset}"
            schema_rows = await conn.fetch(paginated_query, *params)
            if search_term:
                filtered_count_query = """
                SELECT COUNT(*) AS total FROM (
                SELECT n.nspname
                FROM pg_catalog.pg_namespace n
                WHERE n.nspname NOT LIKE 'pg_%'
                AND n.nspname != 'information_schema'
                HAVING (
                LOWER(n.nspname) LIKE $1
                OR LOWER(pg_catalog.obj_description(n.oid, 'pg_namespace')) LIKE $1
                )
                ) AS sub
                """
                filtered_row = await conn.fetchrow(filtered_count_query, search_term)
                total_filtered = filtered_row["total"] if filtered_row else 0
            else:
                total_filtered = total_all
            schemas_with_tables = []
            for row in schema_rows:
                schema_name = row["schema_name"]
                tables_query = """
                SELECT
                c.relname AS table_name,
                pg_catalog.pg_get_userbyid(c.relowner) AS owner,
                pg_catalog.obj_description(c.oid, 'pg_class') AS description,
                c.reltuples::bigint AS row_count,
                pg_total_relation_size(c.oid) AS size_bytes
                FROM pg_catalog.pg_class c
                WHERE c.relnamespace = (
                SELECT oid FROM pg_catalog.pg_namespace WHERE nspname = $1
                )
                AND c.relkind = 'r'
                """
                table_params = [schema_name]
                if search_term and not (search_term in schema_name.lower() or (row["description"] and search_term in row["description"].lower())):
                    tables_query += """
                    AND (
                    LOWER(c.relname) LIKE $2
                    OR LOWER(pg_catalog.obj_description(c.oid, 'pg_class')) LIKE $2
                    )
                    """
                    table_params.append(f"%{search_term}%")
                tables_query += " ORDER BY c.relname"
                table_rows = await conn.fetch(tables_query, *table_params)
                tables = []
                for tr in table_rows:
                    row_count = max(0, int(tr["row_count"])) if tr["row_count"] is not None else 0
                    size_bytes = tr["size_bytes"] or 0
                    size_pretty = self._human_readable_size(size_bytes)
                    tables.append(
                        {
                            "table_name": tr["table_name"],
                            "owner": tr["owner"],
                            "description": tr["description"],
                            "row_count": row_count,
                            "size_bytes": size_bytes,
                            "size_pretty": size_pretty,
                        }
                    )
                schemas_with_tables.append(
                    {
                        "schema_name": schema_name,
                        "description": row["description"],
                        "tables": tables,
                    }
                )
            pagination_info = calculate_pagination_info(total_filtered, page, size)
            return {
                "connection_id": connection.id,
                "connection_name": connection.name,
                "total_schemas": total_all,
                "total_filtered_schemas": total_filtered,
                **pagination_info,
                "schemas": schemas_with_tables,
            }

    async def get_tables_temporary(
        self,
        connection_id: int,
        page: int = 1,
        size: int = 20,
        search: str | None = None,
    ) -> dict[str, Any]:
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
        count_query = f"SELECT COUNT(*) AS total FROM ({base_query}) AS sub"
        params = []
        search_term = search.strip().lower() if search and search.strip() else None
        if search_term:
            base_query += """
            AND (
            LOWER(c.relname) LIKE $1
            OR LOWER(pg_catalog.obj_description(c.oid, 'pg_class')) LIKE $1
            )
            """
            count_query = """
            SELECT COUNT(*) AS total FROM (
            SELECT *
            FROM pg_catalog.pg_class c
            WHERE c.relpersistence = 't'
            AND c.relkind = 'r'
            AND (
            LOWER(c.relname) LIKE $1
            OR LOWER(pg_catalog.obj_description(c.oid, 'pg_class')) LIKE $1
            )
            ) AS sub
            """
            params.append(f"%{search_term}%")
        async with external_db_connection(connection) as conn:
            total_all_res = await conn.fetchrow("""
            SELECT COUNT(*) AS total
            FROM pg_class
            WHERE relpersistence = 't' AND relkind = 'r'
            """)
            total_all = total_all_res["total"] if total_all_res else 0
            total_filtered_res = await conn.fetchrow(count_query, *params)
            total_filtered = total_filtered_res["total"] if total_filtered_res else 0
            offset = (page - 1) * size
            paginated_query = f"{base_query} ORDER BY c.relname LIMIT {size} OFFSET {offset}"
            table_rows = await conn.fetch(paginated_query, *params)
            tables = []
            for tr in table_rows:
                row_count = max(0, int(tr["row_count"])) if tr["row_count"] is not None else 0
                size_bytes = tr["size_bytes"] or 0
                size_pretty = self._human_readable_size(size_bytes)
                tables.append(
                    {
                        "table_name": tr["table_name"],
                        "owner": tr["owner"],
                        "description": tr["description"],
                        "row_count": row_count,
                        "size_bytes": size_bytes,
                        "size_pretty": size_pretty,
                    }
                )
            pagination_info = calculate_pagination_info(total_filtered, page, size)
            return {
                "connection_id": connection.id,
                "connection_name": connection.name,
                "total_temp_tables": total_all,
                "total_filtered_temp_tables": total_filtered,
                **pagination_info,
                "temporary_tables": tables,
            }

    async def get_tables_privileges_for_users(
        self,
        connection_id: int,
        page: int = 1,
        size: int = 20,
        search: str | None = None,
    ) -> dict[str, Any]:
        connection = await self._get_connection(connection_id)
        async with external_db_connection(connection) as conn:
            user_rows = await conn.fetch("SELECT oid, rolname FROM pg_roles WHERE rolcanlogin = true ORDER BY rolname;")
            user_oids = {row["oid"] for row in user_rows}
            oid_to_rolname = {row["oid"]: row["rolname"] for row in user_rows}
            all_usernames = sorted(oid_to_rolname.values())
            table_rows = await conn.fetch("""
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
            """)
            table_info = {
                row["table_oid"]: {
                    "schema_name": row["schema_name"],
                    "table_name": row["table_name"],
                    "owner": row["owner"],
                    "privileges": {
                        username: {
                            "SELECT": False,
                            "INSERT": False,
                            "UPDATE": False,
                            "DELETE": False,
                            "TRUNCATE": False,
                        }
                        for username in all_usernames
                    },
                }
                for row in table_rows
            }
            acl_rows = await conn.fetch("""
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
            """)
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
                    ],
                }
                all_entries.append(entry)
            search_term = search.strip().lower() if search and search.strip() else None
            filtered_entries = []
            if not search_term:
                filtered_entries = all_entries
            else:
                for entry in all_entries:
                    matches_table = search_term in entry["schema_name"].lower() or search_term in entry["table_name"].lower() or search_term in entry["owner"].lower()
                    if matches_table:
                        filtered_entries.append(entry)
                        continue
                    matching_users = [up for up in entry["user_privileges"] if search_term in up["user"].lower()]
                    if matching_users:
                        entry_copy = entry.copy()
                        entry_copy["user_privileges"] = matching_users
                        filtered_entries.append(entry_copy)
            total_tables = len(all_entries)
            total_filtered = len(filtered_entries)
            pagination_info = calculate_pagination_info(total_filtered, page, size)
            start = (page - 1) * size
            end = start + size
            paginated = filtered_entries[start:end]
            return {
                "connection_id": connection.id,
                "connection_name": connection.name,
                "total_tables": total_tables,
                "total_filtered_tables": total_filtered,
                **pagination_info,
                "table_privileges": paginated,
            }

    async def update_tables_privileges_for_users(
        self,
        connection_id: int,
        schema_name: str,
        table_name: str,
        user_privileges: list[dict[str, Any]],
    ) -> list[str]:
        connection = await self._get_connection(connection_id)
        async with external_db_connection(connection) as conn:
            exists = await conn.fetchval(
                "SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = $1 AND c.relname = $2 AND c.relkind = 'r';",
                schema_name,
                table_name,
            )
            if not exists:
                raise ValueError(f"Таблица '{table_name}' в схеме '{schema_name}' не существует.")
            valid_users = {row["rolname"] for row in await conn.fetch("SELECT rolname FROM pg_roles WHERE rolcanlogin = true;")}
            updated_users = []
            for item in user_privileges:
                username = item["username"]
                if username not in valid_users:
                    raise ValueError(f"Пользователь '{username}' не существует или не является логин-ролью.")
                updated_users.append(username)
                quoted_schema = _quote_ident(schema_name)
                quoted_table = _quote_ident(table_name)
                quoted_user = _quote_ident(username)
                target_privileges = ["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE"]
                async with external_db_connection(connection) as conn:
                    acl_rows = await conn.fetch(
                        """
                        SELECT (aclexplode(relacl)).grantee AS grantee_oid,
                        (aclexplode(relacl)).privilege_type
                        FROM pg_class c
                        JOIN pg_namespace n ON n.oid = c.relnamespace
                        WHERE n.nspname = $1 AND c.relname = $2 AND c.relkind = 'r';
                        """,
                        schema_name,
                        table_name,
                    )
                    user_oid_row = await conn.fetchrow("SELECT oid FROM pg_roles WHERE rolname = $1", username)
                    if not user_oid_row:
                        continue
                    user_oid = user_oid_row["oid"]
                    current_privs = {row["privilege_type"] for row in acl_rows if row["grantee_oid"] == user_oid}
                    for priv in target_privileges:
                        desired = item[priv.lower()]
                        current = priv in current_privs
                        if desired and not current:
                            await conn.execute(f"GRANT {priv} ON TABLE {quoted_schema}.{quoted_table} TO {quoted_user};")
                        elif not desired and current:
                            await conn.execute(f"REVOKE {priv} ON TABLE {quoted_schema}.{quoted_table} FROM {quoted_user};")
            return updated_users

    async def get_table_details(
        self,
        connection_id: int,
        schema_name: str,
        table_name: str,
    ) -> dict[str, Any]:
        connection = await self._get_connection(connection_id)
        async with external_db_connection(connection) as conn:
            table_row = await conn.fetchrow(
                """
                SELECT
                    pg_catalog.pg_get_userbyid(c.relowner) AS owner,
                    pg_catalog.obj_description(c.oid, 'pg_class') AS description
                FROM pg_catalog.pg_class c
                JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
                WHERE n.nspname = $1
                  AND c.relname = $2
                  AND c.relkind = 'r'
                """,
                schema_name,
                table_name,
            )
            if not table_row:
                raise ValueError(f"Таблица {schema_name}.{table_name} не найдена")

            column_rows = await conn.fetch(
                """
                SELECT
                    column_name,
                    data_type,
                    is_nullable,
                    column_default,
                    pg_catalog.col_description(
                        (quote_ident(table_schema) || '.' || quote_ident(table_name))::regclass::oid,
                        ordinal_position
                    ) AS description,
                    character_maximum_length,
                    numeric_precision,
                    numeric_scale
                FROM information_schema.columns
                WHERE table_schema = $1
                  AND table_name = $2
                ORDER BY ordinal_position
                """,
                schema_name,
                table_name,
            )

            return {
                "schema_name": schema_name,
                "table_name": table_name,
                "owner": table_row["owner"],
                "description": table_row["description"],
                "columns": [
                    {
                        "column_name": row["column_name"],
                        "data_type": row["data_type"],
                        "is_nullable": row["is_nullable"] == "YES",
                        "column_default": row["column_default"],
                        "description": row["description"],
                        "character_maximum_length": row["character_maximum_length"],
                        "numeric_precision": row["numeric_precision"],
                        "numeric_scale": row["numeric_scale"],
                    }
                    for row in column_rows
                ],
            }

    async def get_tables_privileges_for_groups(
        self,
        connection_id: int,
        page: int = 1,
        size: int = 20,
        search: str | None = None,
        table_kind: Literal["regular", "temporary", "all"] = "regular",
    ) -> dict[str, Any]:
        connection = await self._get_connection(connection_id)
        async with external_db_connection(connection) as conn:
            # Получаем все группы (non-login роли) БЕЗ системных ролей pg_*
            group_rows = await conn.fetch("SELECT oid, rolname FROM pg_roles WHERE rolcanlogin = false AND rolname !~ '^pg_' ORDER BY rolname;")
            group_oids = {row["oid"] for row in group_rows}
            oid_to_rolname = {row["oid"]: row["rolname"] for row in group_rows}
            all_groupnames = sorted(oid_to_rolname.values())
            schema_filter = """
            AND n.nspname NOT LIKE 'pg_%'
            AND n.nspname != 'information_schema'
            """
            if table_kind == "temporary":
                schema_filter = """
                AND n.nspname LIKE 'pg_temp_%'
                """
            elif table_kind == "all":
                schema_filter = """
                AND n.nspname != 'information_schema'
                """
            table_rows = await conn.fetch(f"""
            SELECT
            n.nspname AS schema_name,
            c.relname AS table_name,
            c.oid AS table_oid,
            pg_get_userbyid(c.relowner) AS owner
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relkind = 'r'
            {schema_filter}
            ORDER BY n.nspname, c.relname;
            """)
            table_info = {
                row["table_oid"]: {
                    "schema_name": row["schema_name"],
                    "table_name": row["table_name"],
                    "owner": row["owner"],
                    "privileges": {
                        groupname: {
                            "SELECT": False,
                            "INSERT": False,
                            "UPDATE": False,
                            "DELETE": False,
                            "TRUNCATE": False,
                        }
                        for groupname in all_groupnames
                    },
                }
                for row in table_rows
            }
            acl_rows = await conn.fetch(f"""
            SELECT
            c.oid AS table_oid,
            (aclexplode(c.relacl)).grantee AS grantee_oid,
            (aclexplode(c.relacl)).privilege_type
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relkind = 'r'
            {schema_filter}
            AND c.relacl IS NOT NULL;
            """)
            target_privileges = {"SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE"}
            for row in acl_rows:
                table_oid = row["table_oid"]
                grantee_oid = row["grantee_oid"]
                privilege = row["privilege_type"]
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
                    ],
                }
                all_entries.append(entry)
            search_term = search.strip().lower() if search and search.strip() else None
            filtered_entries = []
            if not search_term:
                filtered_entries = all_entries
            else:
                for entry in all_entries:
                    # 🔧 ИЗМЕНЕНО: Поиск только по имени таблицы и владельцу (без поиска по именам групп)
                    matches_table = search_term in entry["table_name"].lower() or search_term in entry["owner"].lower()
                    if matches_table:
                        filtered_entries.append(entry)
                    # Убран блок поиска по именам групп
            total_tables = len(all_entries)
            total_filtered = len(filtered_entries)
            pagination_info = calculate_pagination_info(total_filtered, page, size)
            start = (page - 1) * size
            end = start + size
            paginated = filtered_entries[start:end]
            return {
                "connection_id": connection.id,
                "connection_name": connection.name,
                "requested_groups": all_groupnames,
                "total_tables": total_tables,
                "total_filtered_tables": total_filtered,
                **pagination_info,
                "table_privileges": paginated,
            }

    async def update_tables_privileges_for_groups(
        self,
        connection_id: int,
        schema_name: str,
        table_name: str,
        group_privileges: list[dict[str, Any]],
    ) -> list[str]:
        connection = await self._get_connection(connection_id)
        async with external_db_connection(connection) as conn:
            exists = await conn.fetchval(
                "SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = $1 AND c.relname = $2 AND c.relkind = 'r';",
                schema_name,
                table_name,
            )
            if not exists:
                raise ValueError(f"Таблица '{table_name}' в схеме '{schema_name}' не существует.")
            # Получаем только группы без системных ролей pg_*
            valid_groups = {row["rolname"] for row in await conn.fetch("SELECT rolname FROM pg_roles WHERE rolcanlogin = false AND rolname !~ '^pg_';")}
            updated_groups = []
            target_privileges = ["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE"]
            for item in group_privileges:
                groupname = item["groupname"]
                if groupname not in valid_groups:
                    raise ValueError(f"Группа '{groupname}' не существует или не является группой.")
                updated_groups.append(groupname)
                quoted_schema = _quote_ident(schema_name)
                quoted_table = _quote_ident(table_name)
                quoted_group = _quote_ident(groupname)
                async with external_db_connection(connection) as conn:
                    acl_rows = await conn.fetch(
                        """
                        SELECT (aclexplode(relacl)).grantee AS grantee_oid,
                        (aclexplode(relacl)).privilege_type
                        FROM pg_class c
                        JOIN pg_namespace n ON n.oid = c.relnamespace
                        WHERE n.nspname = $1 AND c.relname = $2 AND c.relkind = 'r';
                        """,
                        schema_name,
                        table_name,
                    )
                    group_oid_row = await conn.fetchrow("SELECT oid FROM pg_roles WHERE rolname = $1", groupname)
                    if not group_oid_row:
                        continue
                    group_oid = group_oid_row["oid"]
                    current_privs = {row["privilege_type"] for row in acl_rows if row["grantee_oid"] == group_oid}
                    for priv in target_privileges:
                        desired = item[priv.lower()]
                        current = priv in current_privs
                        if desired and not current:
                            await conn.execute(f"GRANT {priv} ON TABLE {quoted_schema}.{quoted_table} TO {quoted_group};")
                        elif not desired and current:
                            await conn.execute(f"REVOKE {priv} ON TABLE {quoted_schema}.{quoted_table} FROM {quoted_group};")
            return updated_groups
