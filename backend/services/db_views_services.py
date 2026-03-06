# backend/services/db_views_services.py

from typing import Any, Literal

from asyncpg.utils import _quote_ident
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.db import DB_Connection
from backend.utils.external_db import external_db_connection, get_db_connection_by_id
from backend.utils.pagination import PaginatedServiceResponse, paginate_raw_sql


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
        search: str | None = None,
    ) -> dict[str, Any]:
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
        search: str | None = None,
    ) -> dict[str, Any]:
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

    async def get_views_privileges_for_groups(
        self,
        connection_id: int,
        page: int = 1,
        size: int = 20,
        search: str | None = None,
        view_kind: Literal["view", "materialized"] = "view",
    ) -> dict[str, Any]:
        connection = await self._get_connection(connection_id)
        relkind = "v" if view_kind == "view" else "m"

        async with external_db_connection(connection) as conn:
            group_rows = await conn.fetch("SELECT oid, rolname FROM pg_roles WHERE rolcanlogin = false AND rolname !~ '^pg_' ORDER BY rolname;")
            group_oids = {row["oid"] for row in group_rows}
            oid_to_rolname = {row["oid"]: row["rolname"] for row in group_rows}
            all_groupnames = sorted(oid_to_rolname.values())

            view_rows = await conn.fetch(
                """
                SELECT
                    n.nspname AS schema_name,
                    c.relname AS view_name,
                    c.oid AS view_oid,
                    pg_get_userbyid(c.relowner) AS owner,
                    pg_catalog.obj_description(c.oid, 'pg_class') AS description
                FROM pg_class c
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE c.relkind::text = $1
                AND n.nspname NOT LIKE 'pg_%'
                AND n.nspname != 'information_schema'
                ORDER BY n.nspname, c.relname;
                """,
                relkind,
            )

            view_info = {
                row["view_oid"]: {
                    "schema_name": row["schema_name"],
                    "view_name": row["view_name"],
                    "owner": row["owner"],
                    "description": row["description"],
                    "privileges": {groupname: {"CREATE": False, "USAGE": False} for groupname in all_groupnames},
                }
                for row in view_rows
            }

            acl_rows = await conn.fetch(
                """
                SELECT
                    c.oid AS view_oid,
                    (aclexplode(c.relacl)).grantee AS grantee_oid,
                    (aclexplode(c.relacl)).privilege_type
                FROM pg_class c
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE c.relkind::text = $1
                AND n.nspname NOT LIKE 'pg_%'
                AND n.nspname != 'information_schema'
                AND c.relacl IS NOT NULL;
                """,
                relkind,
            )

            for row in acl_rows:
                view_oid = row["view_oid"]
                grantee_oid = row["grantee_oid"]
                privilege = row["privilege_type"]
                if grantee_oid not in group_oids or privilege not in ("CREATE", "USAGE"):
                    continue
                groupname = oid_to_rolname[grantee_oid]
                if view_oid in view_info and groupname in view_info[view_oid]["privileges"]:
                    view_info[view_oid]["privileges"][groupname][privilege] = True

            all_entries = []
            for info in view_info.values():
                entry = {
                    "schema_name": info["schema_name"],
                    "view_name": info["view_name"],
                    "owner": info["owner"],
                    "description": info["description"],
                    "role_privileges": [
                        {
                            "role": group,
                            "create": priv["CREATE"],
                            "usage": priv["USAGE"],
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
                    matches_view = (
                        search_term in entry["schema_name"].lower()
                        or search_term in entry["view_name"].lower()
                        or (entry["description"] and search_term in entry["description"].lower())
                        or search_term in entry["owner"].lower()
                    )
                    if matches_view:
                        filtered_entries.append(entry)
                        continue

                    matching_roles = [rp for rp in entry["role_privileges"] if search_term in rp["role"].lower()]
                    if matching_roles:
                        entry_copy = entry.copy()
                        entry_copy["role_privileges"] = matching_roles
                        filtered_entries.append(entry_copy)

            total_views = len(all_entries)
            total_filtered = len(filtered_entries)
            start = (page - 1) * size
            end = start + size
            paginated = filtered_entries[start:end]

            result = PaginatedServiceResponse.prepare_response(
                connection_id=connection.id,
                connection_name=connection.name,
                total_items=total_views,
                total_filtered_items=total_filtered,
                page=page,
                size=size,
            )
            result["view_privileges"] = paginated
            if view_kind == "view":
                result["total_views"] = total_views
                result["total_filtered_views"] = total_filtered
            else:
                result["total_materialized_views"] = total_views
                result["total_filtered_materialized_views"] = total_filtered
            return result

    async def update_view_privileges_for_groups(
        self,
        connection_id: int,
        schema_name: str,
        view_name: str,
        group_privileges: list[dict[str, Any]],
        view_kind: Literal["view", "materialized"] = "view",
    ) -> list[str]:
        connection = await self._get_connection(connection_id)
        relkind = "v" if view_kind == "view" else "m"

        async with external_db_connection(connection) as conn:
            exists = await conn.fetchval(
                """
                SELECT 1
                FROM pg_class c
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE n.nspname = $1 AND c.relname = $2 AND c.relkind::text = $3;
                """,
                schema_name,
                view_name,
                relkind,
            )
            if not exists:
                view_type = "Представление" if view_kind == "view" else "Материализованное представление"
                raise ValueError(f"{view_type} '{schema_name}.{view_name}' не существует.")

            valid_groups = {
                row["rolname"]
                for row in await conn.fetch("SELECT rolname FROM pg_roles WHERE rolcanlogin = false AND rolname !~ '^pg_';")
            }

            quoted_schema = _quote_ident(schema_name)
            quoted_view = _quote_ident(view_name)
            updated_groups = []

            for item in group_privileges:
                groupname = item["groupname"]
                create = item["create"]
                usage = item["usage"]

                if groupname not in valid_groups:
                    raise ValueError(
                        f"Группа '{groupname}' не существует или не является группой (ожидается rolcanlogin = false)."
                    )

                quoted_group = _quote_ident(groupname)
                updated_groups.append(groupname)

                if usage:
                    await conn.execute(f"GRANT USAGE ON {quoted_schema}.{quoted_view} TO {quoted_group};")
                else:
                    await conn.execute(f"REVOKE USAGE ON {quoted_schema}.{quoted_view} FROM {quoted_group};")

                if create:
                    await conn.execute(f"GRANT CREATE ON {quoted_schema}.{quoted_view} TO {quoted_group};")
                else:
                    await conn.execute(f"REVOKE CREATE ON {quoted_schema}.{quoted_view} FROM {quoted_group};")

            return updated_groups
