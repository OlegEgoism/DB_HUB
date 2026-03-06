# backend/services/db_views_services.py

from typing import Any

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


    async def update_views_privileges_for_groups(
        self,
        connection_id: int,
        schema_name: str,
        view_name: str,
        group_privileges: list[dict[str, Any]],
    ) -> list[str]:
        connection = await self._get_connection(connection_id)
        async with external_db_connection(connection) as conn:
            exists = await conn.fetchval(
                """
                SELECT 1
                FROM pg_class c
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE n.nspname = $1 AND c.relname = $2 AND c.relkind = 'v';
                """,
                schema_name,
                view_name,
            )
            if not exists:
                raise ValueError(f"Представление '{view_name}' в схеме '{schema_name}' не существует.")

            valid_groups = {
                row["rolname"]
                for row in await conn.fetch("SELECT rolname FROM pg_roles WHERE rolcanlogin = false AND rolname !~ '^pg_';")
            }

            updated_groups = []
            target_privileges = ["SELECT", "INSERT", "UPDATE", "DELETE"]
            quoted_schema = _quote_ident(schema_name)
            quoted_view = _quote_ident(view_name)

            for item in group_privileges:
                groupname = item["groupname"]
                if groupname not in valid_groups:
                    raise ValueError(f"Группа '{groupname}' не существует или не является группой.")

                updated_groups.append(groupname)
                quoted_group = _quote_ident(groupname)

                acl_rows = await conn.fetch(
                    """
                    SELECT (aclexplode(relacl)).grantee AS grantee_oid,
                           (aclexplode(relacl)).privilege_type
                    FROM pg_class c
                    JOIN pg_namespace n ON n.oid = c.relnamespace
                    WHERE n.nspname = $1 AND c.relname = $2 AND c.relkind = 'v';
                    """,
                    schema_name,
                    view_name,
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
                        await conn.execute(f"GRANT {priv} ON TABLE {quoted_schema}.{quoted_view} TO {quoted_group};")
                    elif not desired and current:
                        await conn.execute(f"REVOKE {priv} ON TABLE {quoted_schema}.{quoted_view} FROM {quoted_group};")

            return updated_groups

    async def update_materialized_views_privileges_for_groups(
        self,
        connection_id: int,
        schema_name: str,
        view_name: str,
        group_privileges: list[dict[str, Any]],
    ) -> list[str]:
        connection = await self._get_connection(connection_id)
        async with external_db_connection(connection) as conn:
            exists = await conn.fetchval(
                """
                SELECT 1
                FROM pg_class c
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE n.nspname = $1 AND c.relname = $2 AND c.relkind = 'm';
                """,
                schema_name,
                view_name,
            )
            if not exists:
                raise ValueError(f"Материализованное представление '{view_name}' в схеме '{schema_name}' не существует.")

            valid_groups = {
                row["rolname"]
                for row in await conn.fetch("SELECT rolname FROM pg_roles WHERE rolcanlogin = false AND rolname !~ '^pg_';")
            }

            updated_groups = []
            target_privileges = ["SELECT"]
            quoted_schema = _quote_ident(schema_name)
            quoted_view = _quote_ident(view_name)

            for item in group_privileges:
                groupname = item["groupname"]
                if groupname not in valid_groups:
                    raise ValueError(f"Группа '{groupname}' не существует или не является группой.")

                updated_groups.append(groupname)
                quoted_group = _quote_ident(groupname)

                acl_rows = await conn.fetch(
                    """
                    SELECT (aclexplode(relacl)).grantee AS grantee_oid,
                           (aclexplode(relacl)).privilege_type
                    FROM pg_class c
                    JOIN pg_namespace n ON n.oid = c.relnamespace
                    WHERE n.nspname = $1 AND c.relname = $2 AND c.relkind = 'm';
                    """,
                    schema_name,
                    view_name,
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
                        await conn.execute(f"GRANT {priv} ON TABLE {quoted_schema}.{quoted_view} TO {quoted_group};")
                    elif not desired and current:
                        await conn.execute(f"REVOKE {priv} ON TABLE {quoted_schema}.{quoted_view} FROM {quoted_group};")

            return updated_groups
