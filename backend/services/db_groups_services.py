# backend/services/db_groups_services.py

from asyncpg.utils import _quote_ident
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.db import DB_Connection
from backend.schemas.db_groups_schemas import DBGroupCreate, DBGroupOut, DBGroupUpdate
from backend.utils.external_db import external_db_connection, get_db_connection_by_id
from backend.utils.pagination import PaginatedResponse


class DBGroupService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_connection(self, connection_id: int) -> DB_Connection | None:
        return await get_db_connection_by_id(self.db, connection_id)

    async def list_groups(
        self,
        connection_id: int,
        page: int = 1,
        size: int = 20,
        search: str | None = None,
    ) -> dict:
        connection = await self.get_connection(connection_id)
        if not connection:
            raise ValueError("Подключение не найдено")
        async with external_db_connection(connection) as conn:
            if search and search.strip():
                search_term = f"%{search.strip()}%"
                query = """
                       SELECT
                           r.oid,
                           r.rolname AS name,
                           pg_catalog.shobj_description(r.oid, 'pg_authid') AS description,
                           COUNT(m.member) AS user_count
                       FROM pg_roles r
                       LEFT JOIN pg_auth_members m ON r.oid = m.roleid
                       WHERE r.rolcanlogin = false
                         AND r.rolname !~ '^pg_'
                         AND (r.rolname ILIKE $1
                              OR pg_catalog.shobj_description(r.oid, 'pg_authid') ILIKE $1)
                       GROUP BY r.oid, r.rolname
                       ORDER BY r.rolname
                   """
                rows = await conn.fetch(query, search_term)
            else:
                query = """
                       SELECT
                           r.oid,
                           r.rolname AS name,
                           pg_catalog.shobj_description(r.oid, 'pg_authid') AS description,
                           COUNT(m.member) AS user_count
                       FROM pg_roles r
                       LEFT JOIN pg_auth_members m ON r.oid = m.roleid
                       WHERE r.rolcanlogin = false
                         AND r.rolname !~ '^pg_'
                       GROUP BY r.oid, r.rolname
                       ORDER BY r.rolname
                   """
                rows = await conn.fetch(query)
        total = len(rows)
        start = (page - 1) * size
        paginated_rows = rows[start : start + size]
        items = [
            DBGroupOut(
                oid=row["oid"],
                name=row["name"],
                description=row["description"] or None,
                user_count=row["user_count"],
            )
            for row in paginated_rows
        ]
        return PaginatedResponse.create(items=items, total=total, page=page, size=size)

    async def get_group(self, connection_id: int, group_oid: int) -> DBGroupOut:
        connection = await self.get_connection(connection_id)
        if not connection:
            raise ValueError("Подключение не найдено")
        if group_oid <= 0:
            raise ValueError("Недопустимый oid группы")
        async with external_db_connection(connection) as conn:
            row = await conn.fetchrow(
                """
                SELECT
                    r.oid,
                    r.rolname AS name,
                    pg_catalog.shobj_description(r.oid, 'pg_authid') AS description,
                    COUNT(m.member) AS user_count
                FROM pg_roles r
                LEFT JOIN pg_auth_members m ON r.oid = m.roleid
                WHERE r.oid = $1
                  AND r.rolcanlogin = false
                  AND r.rolname !~ '^pg_'
                GROUP BY r.oid, r.rolname
            """,
                group_oid,
            )
            if not row:
                raise ValueError(f"Группа с oid {group_oid} не найдена или является системной")
            return DBGroupOut(
                oid=row["oid"],
                name=row["name"],
                description=row["description"] or None,
                user_count=row["user_count"],
            )

    async def create_group(self, connection_id: int, create_data: DBGroupCreate) -> dict:
        connection = await self.get_connection(connection_id)
        if not connection:
            raise ValueError("Подключение не найдено")
        group_name = create_data.name
        description = create_data.description or ""
        async with external_db_connection(connection) as conn:
            exists = await conn.fetchval("SELECT 1 FROM pg_roles WHERE rolname = $1", group_name)
            if exists:
                raise ValueError(f"Группа с именем '{group_name}' уже существует")
            quoted_name = _quote_ident(group_name)
            await conn.execute(f"CREATE ROLE {quoted_name} NOLOGIN")
            await conn.execute(f"COMMENT ON ROLE {quoted_name} IS $${description}$$")
            oid = await conn.fetchval("SELECT oid FROM pg_roles WHERE rolname = $1", group_name)
            if not oid:
                raise Exception("Не удалось получить oid созданной группы")
            return {
                "success": True,
                "oid": oid,
                "name": group_name,
                "description": create_data.description,
            }

    async def update_group(self, connection_id: int, group_oid: int, update_data: DBGroupUpdate) -> dict:
        connection = await self.get_connection(connection_id)
        if not connection:
            raise ValueError("Подключение не найдено")
        if group_oid <= 0:
            raise ValueError("Недопустимый oid группы")
        async with external_db_connection(connection) as conn:
            row = await conn.fetchrow(
                """
                SELECT rolname
                FROM pg_roles
                WHERE oid = $1
                  AND rolcanlogin = false
                  AND rolname !~ '^pg_'
            """,
                group_oid,
            )
            if not row:
                raise ValueError(f"Группа с oid {group_oid} не найдена или является системной")
            current_name = row["rolname"]
            new_name = update_data.name
            new_description = update_data.description
            effective_name = current_name
            if new_name is not None and new_name != current_name:
                if new_name.lower().startswith("pg_"):
                    raise ValueError("Имя группы не может начинаться с 'pg_'")
                taken = await conn.fetchval("SELECT 1 FROM pg_roles WHERE rolname = $1", new_name)
                if taken:
                    raise ValueError(f"Группа с именем '{new_name}' уже существует")
                quoted_old = _quote_ident(current_name)
                quoted_new = _quote_ident(new_name)
                await conn.execute(f"ALTER ROLE {quoted_old} RENAME TO {quoted_new}")
                effective_name = new_name
            quoted_eff = _quote_ident(effective_name)
            comment_value = new_description if new_description is not None else ""
            await conn.execute(f"COMMENT ON ROLE {quoted_eff} IS $${comment_value}$$")
            return {
                "success": True,
                "oid": group_oid,
                "old_name": current_name,
                "new_name": effective_name,
                "description": new_description,
            }

    async def delete_group(self, connection_id: int, group_oid: int, transfer_owner_to: str | None = None) -> dict:
        connection = await self.get_connection(connection_id)
        if not connection:
            raise ValueError("Подключение не найдено")
        if group_oid <= 0:
            raise ValueError("Недопустимый oid группы")
        async with external_db_connection(connection) as conn:
            row = await conn.fetchrow(
                """
                SELECT rolname
                FROM pg_roles
                WHERE oid = $1
                  AND rolcanlogin = false
                  AND rolname !~ '^pg_'
            """,
                group_oid,
            )
            if not row:
                raise ValueError(f"Группа с oid {group_oid} не найдена или является системной")
            group_name = row["rolname"]
            quoted_name = _quote_ident(group_name)
            try:
                effective_transfer_owner = transfer_owner_to
                if not effective_transfer_owner and connection.username and connection.username != group_name:
                    default_target_exists = await conn.fetchval("SELECT EXISTS(SELECT 1 FROM pg_roles WHERE rolname = $1)", connection.username)
                    if default_target_exists:
                        effective_transfer_owner = connection.username

                if effective_transfer_owner:
                    if effective_transfer_owner == group_name:
                        raise ValueError("Нельзя передать владение удаляемой группе самой себе")
                    target_exists = await conn.fetchval("SELECT EXISTS(SELECT 1 FROM pg_roles WHERE rolname = $1)", effective_transfer_owner)
                    if not target_exists:
                        raise ValueError(f"Роль-получатель '{effective_transfer_owner}' не найдена")
                    quoted_target_name = _quote_ident(effective_transfer_owner)
                    await conn.execute(f"REASSIGN OWNED BY {quoted_name} TO {quoted_target_name}")
                    await conn.execute(f"DROP OWNED BY {quoted_name}")
                else:
                    await conn.execute(f"DROP OWNED BY {quoted_name} CASCADE")
                await conn.execute(f"DROP ROLE {quoted_name}")
            except Exception as e:
                error_msg = str(e).lower()
                if "does not exist" in error_msg or "could not find role" in error_msg:
                    pass
                else:
                    raise ValueError(
                        f"Не удалось удалить группу из внешней БД: {e}. "
                        "Выберите пользователя/роль для передачи владения и повторите удаление."
                    ) from e
        return {
            "success": True,
            "oid": group_oid,
            "name": group_name,
            "message": f"Группа '{group_name}' успешно удалена",
        }

    async def get_group_with_users(self, connection_id: int, group_oid: int) -> dict:
        connection = await self.get_connection(connection_id)
        if not connection:
            raise ValueError("Подключение не найдено")
        if group_oid <= 0:
            raise ValueError("Недопустимый oid группы")
        async with external_db_connection(connection) as conn:
            group_row = await conn.fetchrow(
                """
                SELECT
                    r.oid,
                    r.rolname AS name,
                    pg_catalog.shobj_description(r.oid, 'pg_authid') AS description
                FROM pg_roles r
                WHERE r.oid = $1
                  AND r.rolcanlogin = false
                  AND r.rolname !~ '^pg_'
            """,
                group_oid,
            )
            if not group_row:
                raise ValueError(f"Группа с oid {group_oid} не найдена или является системной")
            users_rows = await conn.fetch(
                """
                SELECT
                    u.oid,
                    u.rolname AS name,
                    pg_catalog.shobj_description(u.oid, 'pg_authid') AS description
                FROM pg_auth_members m
                JOIN pg_roles u ON m.member = u.oid
                WHERE m.roleid = $1
                  AND u.rolcanlogin = true
                ORDER BY u.rolname
            """,
                group_oid,
            )
            user_count = len(users_rows)
            users = [
                {
                    "oid": row["oid"],
                    "name": row["name"],
                    "description": row["description"] or None,
                }
                for row in users_rows
            ]
            return {
                "oid": group_row["oid"],
                "name": group_row["name"],
                "description": group_row["description"] or None,
                "user_count": user_count,
                "users": users,
            }

    async def add_user_to_group(self, connection_id: int, user_oid: int, group_oid: int) -> dict:
        if user_oid <= 0 or group_oid <= 0:
            raise ValueError("oid пользователя и группы должны быть положительными")
        connection = await self.get_connection(connection_id)
        if not connection:
            raise ValueError("Подключение не найдено")
        async with external_db_connection(connection) as conn:
            user_row = await conn.fetchrow(
                """
                SELECT rolname FROM pg_roles
                WHERE oid = $1 AND rolcanlogin = true AND rolname !~ '^pg_'
            """,
                user_oid,
            )
            if not user_row:
                raise ValueError(f"Пользователь с oid {user_oid} не найден или является системным")
            group_row = await conn.fetchrow(
                """
                SELECT rolname FROM pg_roles
                WHERE oid = $1 AND rolcanlogin = false AND rolname !~ '^pg_'
            """,
                group_oid,
            )
            if not group_row:
                raise ValueError(f"Группа с oid {group_oid} не найдена или является системной")
            username = user_row["rolname"]
            groupname = group_row["rolname"]
            already_member = await conn.fetchval(
                """
                SELECT 1 FROM pg_auth_members
                WHERE member = $1 AND roleid = $2
            """,
                user_oid,
                group_oid,
            )
            if already_member:
                return {
                    "success": True,
                    "message": f"Пользователь '{username}' уже состоит в группе '{groupname}'",
                    "user_oid": user_oid,
                    "group_oid": group_oid,
                }
            quoted_group = _quote_ident(groupname)
            quoted_user = _quote_ident(username)
            await conn.execute(f"GRANT {quoted_group} TO {quoted_user}")
            return {
                "success": True,
                "message": f"Пользователь '{username}' успешно добавлен в группу '{groupname}'",
                "user_oid": user_oid,
                "group_oid": group_oid,
            }

    async def remove_user_from_group(self, connection_id: int, user_oid: int, group_oid: int) -> dict:
        if user_oid <= 0 or group_oid <= 0:
            raise ValueError("OID пользователя и группы должны быть положительными")
        connection = await self.get_connection(connection_id)
        if not connection:
            raise ValueError("Подключение не найдено")
        async with external_db_connection(connection) as conn:
            user_row = await conn.fetchrow(
                """
                SELECT rolname FROM pg_roles
                WHERE oid = $1 AND rolcanlogin = true AND rolname !~ '^pg_'
            """,
                user_oid,
            )
            if not user_row:
                raise ValueError(f"Пользователь с oid {user_oid} не найден или является системным")
            group_row = await conn.fetchrow(
                """
                SELECT rolname FROM pg_roles
                WHERE oid = $1 AND rolcanlogin = false AND rolname !~ '^pg_'
            """,
                group_oid,
            )
            if not group_row:
                raise ValueError(f"Группа с oid {group_oid} не найдена или является системной")
            username = user_row["rolname"]
            groupname = group_row["rolname"]
            is_member = await conn.fetchval(
                """
                SELECT 1 FROM pg_auth_members
                WHERE member = $1 AND roleid = $2
            """,
                user_oid,
                group_oid,
            )
            if not is_member:
                return {
                    "success": True,
                    "message": f"Пользователь '{username}' не состоит в группе '{groupname}'",
                    "user_oid": user_oid,
                    "group_oid": group_oid,
                }
            quoted_group = _quote_ident(groupname)
            quoted_user = _quote_ident(username)
            await conn.execute(f"REVOKE {quoted_group} FROM {quoted_user}")
            return {
                "success": True,
                "message": f"Пользователь '{username}' успешно удалён из группы '{groupname}'",
                "user_oid": user_oid,
                "group_oid": group_oid,
            }
