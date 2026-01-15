# backend/services/db_groups_services.py
import math
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models.db import DB_Connection, DB_Group_User
from backend.schemas.db_groups_schemas import DBGroupOut, PaginatedDBGroupsResponse
from backend.utils.external_db import external_db_connection


class DBGroupService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_connection(self, connection_id: int) -> DB_Connection | None:
        from sqlalchemy import select
        result = await self.db.execute(select(DB_Connection).where(DB_Connection.id == connection_id))
        return result.scalar_one_or_none()

    async def list_groups(
            self,
            connection_id: int,
            page: int = 1,
            size: int = 20,
            search: Optional[str] = None
    ) -> PaginatedDBGroupsResponse:
        connection = await self.get_connection(connection_id)
        if not connection:
            raise ValueError("Подключение не найдено")

        where_conditions = ["r.rolcanlogin = false", "r.rolname !~ '^pg_'"]
        params = []
        param_index = 1
        if search and search.strip():
            where_conditions.append(f"r.rolname ILIKE ${param_index}")
            params.append(f"%{search.strip()}%")
            param_index += 1
        where_clause = " AND ".join(where_conditions)

        async with external_db_connection(connection) as conn:
            groups_query = f"""
                SELECT
                    r.oid,
                    r.rolname AS name,
                    pg_catalog.shobj_description(r.oid, 'pg_authid') AS description,
                    COUNT(m.member) AS user_count
                FROM pg_roles r
                LEFT JOIN pg_auth_members m ON r.oid = m.roleid
                WHERE {where_clause}
                GROUP BY r.oid, r.rolname
                ORDER BY r.rolname
            """
            rows = await conn.fetch(groups_query, *params)
            for row in rows:
                existing = await self.db.execute(select(DB_Group_User).where(DB_Group_User.connection_id == connection_id, DB_Group_User.oid == row["oid"], DB_Group_User.type.is_(True)))
                existing_record = existing.scalar_one_or_none()
                if existing_record:
                    if (existing_record.name != row["name"] or
                            existing_record.description != (row["description"] or None)):
                        existing_record.name = row["name"]
                        existing_record.description = row["description"] or None
                        self.db.add(existing_record)
                else:
                    new_group = DB_Group_User(
                        oid=row["oid"],
                        name=row["name"],
                        description=row["description"] or None,
                        type=True,  # группа
                        connection_id=connection_id
                    )
                    self.db.add(new_group)
            await self.db.commit()
            total = len(rows)
            start = (page - 1) * size
            paginated_rows = rows[start:start + size]
            items = [
                DBGroupOut(
                    oid=row["oid"],
                    name=row["name"],
                    description=row["description"] or None,
                    user_count=row["user_count"]
                )
                for row in paginated_rows
            ]
            pages = math.ceil(total / size) if size > 0 and total > 0 else 1
            return PaginatedDBGroupsResponse(
                items=items,
                total=total,
                page=page,
                size=size,
                pages=pages,
                has_next=page < pages,
                has_prev=page > 1
            )

    async def create_group(self, connection_id: int, create_data: "DBGroupCreate") -> dict:
        connection = await self.get_connection(connection_id)
        if not connection:
            raise ValueError("Подключение не найдено")
        group_name = create_data.name.strip()
        description = (create_data.description or "").strip()
        async with external_db_connection(connection) as conn:
            exists = await conn.fetchval("SELECT 1 FROM pg_roles WHERE rolname = $1", group_name)
            if exists:
                raise ValueError(f"Группа с именем '{group_name}' уже существует")
            await conn.execute(f'CREATE ROLE "{group_name}" NOLOGIN')
            quoted_name = group_name.replace('"', '""')
            await conn.execute(f'COMMENT ON ROLE "{quoted_name}" IS $${description}$$')
            oid = await conn.fetchval("SELECT oid FROM pg_roles WHERE rolname = $1", group_name)
            if not oid:
                raise Exception("Не удалось получить OID созданной группы")
            new_group = DB_Group_User(
                oid=oid,
                name=group_name,
                description=description or None,
                type=True,  # ← группа
                connection_id=connection_id
            )
            self.db.add(new_group)
            await self.db.commit()
            await self.db.refresh(new_group)
            return {
                "success": True,
                "oid": oid,
                "name": group_name,
                "description": create_data.description
            }

    async def update_group(self, connection_id: int, group_oid: int, update_data: "DBGroupUpdate") -> dict:
        connection = await self.get_connection(connection_id)
        if not connection:
            raise ValueError("Подключение не найдено")
        if group_oid <= 0:
            raise ValueError("Недопустимый OID группы")
        new_name = update_data.name
        new_description = update_data.description
        async with external_db_connection(connection) as conn:
            row = await conn.fetchrow("""
                SELECT rolname
                FROM pg_roles
                WHERE oid = $1
                  AND rolcanlogin = false
                  AND rolname !~ '^pg_'
            """, group_oid)
            if not row:
                raise ValueError(f"Группа с OID {group_oid} не найдена или является системной")
            current_name = row["rolname"]
            effective_name = current_name
            if new_name is not None and new_name != current_name:
                if new_name.startswith("pg_"):
                    raise ValueError("Имя группы не может начинаться с 'pg_'")
                taken = await conn.fetchval("SELECT 1 FROM pg_roles WHERE rolname = $1", new_name)
                if taken:
                    raise ValueError(f"Группа с именем '{new_name}' уже существует")
                await conn.execute(f'ALTER ROLE "{current_name}" RENAME TO "{new_name}"')
                effective_name = new_name
            comment_value = new_description if new_description is not None else ''
            quoted_name = effective_name.replace('"', '""')
            await conn.execute(f'COMMENT ON ROLE "{quoted_name}" IS $${comment_value}$$')
            return {
                "success": True,
                "oid": group_oid,
                "old_name": current_name,
                "new_name": effective_name,
                "description": new_description
            }

    async def create_group(self, connection_id: int, create_data: "DBGroupCreate") -> dict:
        connection = await self.get_connection(connection_id)
        if not connection:
            raise ValueError("Подключение не найдено")
        group_name = create_data.name
        description = create_data.description or ""
        async with external_db_connection(connection) as conn:
            exists = await conn.fetchval("SELECT 1 FROM pg_roles WHERE rolname = $1", group_name)
            if exists:
                raise ValueError(f"Группа с именем '{group_name}' уже существует")
            await conn.execute(f'CREATE ROLE "{group_name}" NOLOGIN')
            quoted_name = group_name.replace('"', '""')
            await conn.execute(f'COMMENT ON ROLE "{quoted_name}" IS $${description}$$')
            oid = await conn.fetchval("SELECT oid FROM pg_roles WHERE rolname = $1", group_name)
            return {
                "success": True,
                "oid": oid,
                "name": group_name,
                "description": create_data.description
            }

    # async def delete_group(self, connection_id: int, group_oid: int) -> dict:
    #     connection = await self.get_connection(connection_id)
    #     if not connection:
    #         raise ValueError("Подключение не найдено")
    #     if group_oid <= 0:
    #         raise ValueError("Недопустимый OID группы")
    #     async with external_db_connection(connection) as conn:
    #         row = await conn.fetchrow("""
    #             SELECT rolname
    #             FROM pg_roles
    #             WHERE oid = $1
    #               AND rolcanlogin = false
    #               AND rolname !~ '^pg_'
    #         """, group_oid)
    #         if not row:
    #             raise ValueError(f"Группа с OID {group_oid} не найдена или является системной")
    #         group_name = row["rolname"]
    #         quoted_name = group_name.replace('"', '""')
    #         await conn.execute(f'DROP ROLE "{quoted_name}"')
    #         return {
    #             "success": True,
    #             "oid": group_oid,
    #             "name": group_name,
    #             "message": f"Группа '{group_name}' успешно удалена"
    #         }
    async def delete_group(self, connection_id: int, group_oid: int) -> dict:
        connection = await self.get_connection(connection_id)
        if not connection:
            raise ValueError("Подключение не найдено")
        if group_oid <= 0:
            raise ValueError("Недопустимый OID группы")
        async with external_db_connection(connection) as conn:
            row = await conn.fetchrow("""
                SELECT rolname
                FROM pg_roles
                WHERE oid = $1
                  AND rolcanlogin = false
                  AND rolname !~ '^pg_'
            """, group_oid)
            if not row:
                raise ValueError(f"Группа с OID {group_oid} не найдена или является системной")
            group_name = row["rolname"]
            quoted_name = group_name.replace('"', '""')
            try:
                await conn.execute(f'DROP OWNED BY "{quoted_name}" CASCADE')
                await conn.execute(f'DROP ROLE "{quoted_name}"')
                return {
                    "success": True,
                    "oid": group_oid,
                    "name": group_name,
                    "message": f"Группа '{group_name}' успешно удалена"
                }
            except Exception as e:
                error_msg = str(e)
                if "does not exist" in error_msg:
                    raise ValueError(f"Группа '{group_name}' уже удалена")
                elif "could not find role" in error_msg:
                    raise ValueError(f"Роль '{group_name}' не существует")
                else:
                    raise Exception(f"Не удалось удалить группу: {error_msg}")
