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

