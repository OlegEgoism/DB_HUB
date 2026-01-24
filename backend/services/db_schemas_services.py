# backend/services/db_schemas_services.py

from typing import Any

from asyncpg.utils import _quote_ident
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.db import DB_Connection
from backend.utils.external_db import external_db_connection, get_db_connection_by_id
from backend.utils.pagination import calculate_pagination_info


class DBSchemaService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_connection(self, connection_id: int) -> DB_Connection:
        connection = await get_db_connection_by_id(self.db, connection_id)
        if not connection:
            raise ValueError(f"Подключение с id {connection_id} не найдено")
        return connection

    async def get_schema_privileges_for_users(
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
            all_schemas_rows = await conn.fetch("""
                SELECT
                    nspname AS schema_name,
                    pg_get_userbyid(nspowner) AS owner,
                    pg_catalog.obj_description(oid, 'pg_namespace') AS description
                FROM pg_catalog.pg_namespace
                WHERE nspname NOT LIKE 'pg_%'
                  AND nspname != 'information_schema'
                ORDER BY nspname;
            """)

            all_schemas = {
                row["schema_name"]: {
                    "owner": row["owner"],
                    "description": row["description"],
                    "privileges": {username: {"CREATE": False, "USAGE": False} for username in all_usernames},
                }
                for row in all_schemas_rows
            }

            privilege_rows = await conn.fetch("""
                SELECT
                    nspname AS schema_name,
                    (aclexplode(nspacl)).grantee AS grantee_oid,
                    (aclexplode(nspacl)).privilege_type
                FROM pg_catalog.pg_namespace
                WHERE nspname NOT LIKE 'pg_%'
                  AND nspname != 'information_schema'
                  AND nspacl IS NOT NULL;
            """)

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
                "role_privileges": [{"role": user, "create": priv["CREATE"], "usage": priv["USAGE"]} for user, priv in info["privileges"].items()],
            }
            all_entries.append(schema_entry)

        search_term = search.strip().lower() if search and search.strip() else None
        filtered_entries = []

        if not search_term:
            filtered_entries = all_entries
        else:
            for entry in all_entries:
                matches_schema = (
                    search_term in entry["schema_name"].lower()
                    or (entry["description"] and search_term in entry["description"].lower())
                    or search_term in entry["owner"].lower()
                )

                if matches_schema:
                    filtered_entries.append(entry)
                    continue

                matching_roles = [rp for rp in entry["role_privileges"] if search_term in rp["role"].lower()]

                if matching_roles:
                    entry_copy = entry.copy()
                    entry_copy["role_privileges"] = matching_roles
                    filtered_entries.append(entry_copy)

        total_schemas = len(all_entries)
        total_filtered = len(filtered_entries)

        pagination_info = calculate_pagination_info(total_filtered, page, size)

        start = (page - 1) * size
        end = start + size
        paginated = filtered_entries[start:end]

        return {
            "connection_id": connection.id,
            "connection_name": connection.name,
            "total_schemas": total_schemas,
            "total_filtered_schemas": total_filtered,
            **pagination_info,
            "schema_privileges": paginated,
        }

    async def update_schema_privileges_for_users(
        self,
        connection_id: int,
        schema_name: str,
        user_privileges: list[dict[str, Any]],
    ) -> list[str]:
        connection = await self._get_connection(connection_id)

        async with external_db_connection(connection) as conn:
            exists = await conn.fetchval("SELECT 1 FROM pg_namespace WHERE nspname = $1;", schema_name)
            if not exists:
                raise ValueError(f"Схема '{schema_name}' не существует.")

            valid_users = {row["rolname"] for row in await conn.fetch("SELECT rolname FROM pg_roles WHERE rolcanlogin = true;")}

        updated_users = []

        for item in user_privileges:
            username = item["username"]
            create = item["create"]
            usage = item["usage"]

            if username not in valid_users:
                raise ValueError(f"Пользователь '{username}' не существует или не является логин-ролью.")

            updated_users.append(username)

            quoted_schema = _quote_ident(schema_name)
            quoted_user = _quote_ident(username)

            async with external_db_connection(connection) as conn:
                if usage:
                    await conn.execute(f"GRANT USAGE ON SCHEMA {quoted_schema} TO {quoted_user};")
                else:
                    await conn.execute(f"REVOKE USAGE ON SCHEMA {quoted_schema} FROM {quoted_user};")

                if create:
                    await conn.execute(f"GRANT CREATE ON SCHEMA {quoted_schema} TO {quoted_user};")
                else:
                    await conn.execute(f"REVOKE CREATE ON SCHEMA {quoted_schema} FROM {quoted_user};")

        return updated_users

    async def get_schema_privileges_for_groups(
        self,
        connection_id: int,
        page: int = 1,
        size: int = 20,
        search: str | None = None,
    ) -> dict[str, Any]:
        connection = await self._get_connection(connection_id)

        async with external_db_connection(connection) as conn:
            # Получаем все группы (non-login роли)
            group_rows = await conn.fetch("SELECT oid, rolname FROM pg_roles WHERE rolcanlogin = false ORDER BY rolname;")
            group_oids = {row["oid"] for row in group_rows}
            oid_to_rolname = {row["oid"]: row["rolname"] for row in group_rows}
            all_groupnames = sorted(oid_to_rolname.values())

            # Получаем все схемы
            all_schemas_rows = await conn.fetch("""
                SELECT
                    nspname AS schema_name,
                    pg_get_userbyid(nspowner) AS owner,
                    pg_catalog.obj_description(oid, 'pg_namespace') AS description
                FROM pg_catalog.pg_namespace
                WHERE nspname NOT LIKE 'pg_%'
                  AND nspname != 'information_schema'
                ORDER BY nspname;
            """)

            all_schemas = {
                row["schema_name"]: {
                    "owner": row["owner"],
                    "description": row["description"],
                    "privileges": {groupname: {"CREATE": False, "USAGE": False} for groupname in all_groupnames},
                }
                for row in all_schemas_rows
            }

            # Получаем привилегии на схемы
            privilege_rows = await conn.fetch("""
                SELECT
                    nspname AS schema_name,
                    (aclexplode(nspacl)).grantee AS grantee_oid,
                    (aclexplode(nspacl)).privilege_type
                FROM pg_catalog.pg_namespace
                WHERE nspname NOT LIKE 'pg_%'
                  AND nspname != 'information_schema'
                  AND nspacl IS NOT NULL;
            """)

        # Обработка привилегий вне соединения
        for row in privilege_rows:
            schema = row["schema_name"]
            grantee_oid = row["grantee_oid"]
            privilege = row["privilege_type"]

            if grantee_oid not in group_oids or privilege not in ("CREATE", "USAGE"):
                continue

            groupname = oid_to_rolname[grantee_oid]
            if schema in all_schemas and groupname in all_schemas[schema]["privileges"]:
                all_schemas[schema]["privileges"][groupname][privilege] = True

        # Формируем список записей
        all_entries = []
        for name, info in all_schemas.items():
            schema_entry = {
                "schema_name": name,
                "owner": info["owner"],
                "description": info["description"],
                "role_privileges": [{"role": group, "create": priv["CREATE"], "usage": priv["USAGE"]} for group, priv in info["privileges"].items()],
            }
            all_entries.append(schema_entry)

        # Применяем поиск
        search_term = search.strip().lower() if search and search.strip() else None
        filtered_entries = []

        if not search_term:
            filtered_entries = all_entries
        else:
            for entry in all_entries:
                matches_schema = (
                    search_term in entry["schema_name"].lower()
                    or (entry["description"] and search_term in entry["description"].lower())
                    or search_term in entry["owner"].lower()
                )

                if matches_schema:
                    filtered_entries.append(entry)
                    continue

                matching_roles = [rp for rp in entry["role_privileges"] if search_term in rp["role"].lower()]

                if matching_roles:
                    entry_copy = entry.copy()
                    entry_copy["role_privileges"] = matching_roles
                    filtered_entries.append(entry_copy)

        total_schemas = len(all_entries)
        total_filtered = len(filtered_entries)

        pagination_info = calculate_pagination_info(total_filtered, page, size)

        start = (page - 1) * size
        end = start + size
        paginated = filtered_entries[start:end]

        return {
            "connection_id": connection.id,
            "connection_name": connection.name,
            "total_schemas": total_schemas,
            "total_filtered_schemas": total_filtered,
            **pagination_info,
            "schema_privileges": paginated,
        }

    async def update_schema_privileges_for_groups(
        self,
        connection_id: int,
        schema_name: str,
        group_privileges: list[dict[str, Any]],
    ) -> list[str]:
        connection = await self._get_connection(connection_id)

        async with external_db_connection(connection) as conn:
            exists = await conn.fetchval("SELECT 1 FROM pg_namespace WHERE nspname = $1", schema_name)
            if not exists:
                raise ValueError(f"Схема '{schema_name}' не существует.")

            valid_groups = {row["rolname"] for row in await conn.fetch("SELECT rolname FROM pg_roles WHERE rolcanlogin = false;")}

        updated_groups = []

        for item in group_privileges:
            groupname = item["groupname"]
            create = item["create"]
            usage = item["usage"]

            if groupname not in valid_groups:
                raise ValueError(f"Группа '{groupname}' не существует или не является группой (ожидается rolcanlogin = false).")

            updated_groups.append(groupname)

            quoted_schema = _quote_ident(schema_name)
            quoted_group = _quote_ident(groupname)

            async with external_db_connection(connection) as conn:
                if usage:
                    await conn.execute(f"GRANT USAGE ON SCHEMA {quoted_schema} TO {quoted_group};")
                else:
                    await conn.execute(f"REVOKE USAGE ON SCHEMA {quoted_schema} FROM {quoted_group};")

                if create:
                    await conn.execute(f"GRANT CREATE ON SCHEMA {quoted_schema} TO {quoted_group};")
                else:
                    await conn.execute(f"REVOKE CREATE ON SCHEMA {quoted_schema} FROM {quoted_group};")

        return updated_groups
