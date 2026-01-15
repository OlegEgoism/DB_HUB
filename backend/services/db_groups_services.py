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

    async def list_groups(self, connection_id: int, page: int = 1, size: int = 20, search: Optional[str] = None) -> PaginatedDBGroupsResponse:
        connection = await self.get_connection(connection_id)
        if not connection:
            raise ValueError("Подключение не найдено")

        # ВСЕГДА выполняем полную синхронизацию данных перед любым поиском/фильтрацией
        async with external_db_connection(connection) as conn:
            # Получаем ВСЕ группы из внешней БД
            all_groups_query = """
                SELECT
                    r.oid,
                    r.rolname AS name,
                    pg_catalog.shobj_description(r.oid, 'pg_authid') AS description,
                    COUNT(m.member) AS user_count
                FROM pg_roles r
                LEFT JOIN pg_auth_members m ON r.oid = m.roleid
                WHERE r.rolcanlogin = false AND r.rolname !~ '^pg_'
                GROUP BY r.oid, r.rolname
                ORDER BY r.rolname
            """

            all_external_rows = await conn.fetch(all_groups_query)
            all_external_groups = {row["oid"]: row for row in all_external_rows}

            # Получаем все существующие записи из внутренней БД
            internal_result = await self.db.execute(
                select(DB_Group_User).where(
                    DB_Group_User.connection_id == connection_id,
                    DB_Group_User.type.is_(True)
                )
            )
            internal_records = internal_result.scalars().all()
            internal_groups = {record.oid: record for record in internal_records}

            # Удаление групп, которые больше не существуют во внешней БД
            oids_to_keep = set(all_external_groups.keys())
            oids_in_internal = set(internal_groups.keys())
            oids_to_delete = oids_in_internal - oids_to_keep

            for oid in oids_to_delete:
                record = internal_groups[oid]
                await self.db.delete(record)

            # Обновление/создание записей групп для ВСЕХ данных
            for oid, ext_row in all_external_groups.items():
                int_record = internal_groups.get(oid)
                name = ext_row["name"]
                description = ext_row["description"] or None

                if int_record:
                    if int_record.name != name or int_record.description != description:
                        int_record.name = name
                        int_record.description = description
                        self.db.add(int_record)
                else:
                    new_group = DB_Group_User(
                        oid=oid,
                        name=name,
                        description=description,
                        type=True,
                        connection_id=connection_id
                    )
                    self.db.add(new_group)

            await self.db.commit()

            # ТЕПЕРЬ применяем фильтрацию поиска (если есть)
            if search and search.strip():
                search_term = f"%{search.strip()}%"
                # Выполняем запрос с поиском
                search_query = """
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

                external_rows = await conn.fetch(search_query, search_term)
            else:
                # Без поиска - используем все группы
                external_rows = all_external_rows

        # Пагинация
        total = len(external_rows)
        start = (page - 1) * size
        paginated_rows = external_rows[start:start + size] if total > 0 else []

        items = [
            DBGroupOut(
                oid=row["oid"],
                name=row["name"],
                description=row["description"] or None,
                user_count=row["user_count"]
            ) for row in paginated_rows
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

    async def get_group(self, connection_id: int, group_oid: int) -> DBGroupOut:
        connection = await self.get_connection(connection_id)
        if not connection:
            raise ValueError("Подключение не найдено")
        if group_oid <= 0:
            raise ValueError("Недопустимый OID группы")
        async with external_db_connection(connection) as conn:
            row = await conn.fetchrow("""
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
            """, group_oid)
            if not row:
                raise ValueError(f"Группа с OID {group_oid} не найдена или является системной")
            existing = await self.db.execute(select(DB_Group_User).where(DB_Group_User.connection_id == connection_id, DB_Group_User.oid == group_oid, DB_Group_User.type.is_(True)))
            existing_record = existing.scalar_one_or_none()
            if existing_record:
                if (existing_record.name != row["name"] or
                        existing_record.description != (row["description"] or None)):
                    existing_record.name = row["name"]
                    existing_record.description = row["description"] or None
                    self.db.add(existing_record)
                    await self.db.commit()
            else:
                new_group = DB_Group_User(oid=row["oid"], name=row["name"], description=row["description"] or None, type=True, connection_id=connection_id)
                self.db.add(new_group)
                await self.db.commit()
            return DBGroupOut(oid=row["oid"], name=row["name"], description=row["description"] or None, user_count=row["user_count"])

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
            new_group = DB_Group_User(oid=oid, name=group_name, description=description or None, type=True, connection_id=connection_id)
            self.db.add(new_group)
            await self.db.commit()
            await self.db.refresh(new_group)
            return {"success": True, "oid": oid, "name": group_name, "description": create_data.description}

    async def update_group(self, connection_id: int, group_oid: int, update_data: "DBGroupUpdate") -> dict:
        connection = await self.get_connection(connection_id)
        if not connection:
            raise ValueError("Подключение не найдено")
        if group_oid <= 0:
            raise ValueError("Недопустимый OID группы")
        new_name = update_data.name
        new_description = update_data.description
        from sqlalchemy import select
        result = await self.db.execute(select(DB_Group_User).where(DB_Group_User.connection_id == connection_id, DB_Group_User.oid == group_oid, DB_Group_User.type.is_(True)))
        db_group_record = result.scalar_one_or_none()
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
            if db_group_record:
                if new_name is not None and new_name != current_name:
                    db_group_record.name = effective_name
                if new_description is not None:
                    db_group_record.description = new_description
                elif new_description is None and comment_value == '':
                    db_group_record.description = None
                self.db.add(db_group_record)
            else:
                new_group = DB_Group_User(oid=group_oid, name=effective_name, description=new_description if new_description is not None else None, type=True, connection_id=connection_id)
                self.db.add(new_group)
            await self.db.commit()
            if db_group_record:
                await self.db.refresh(db_group_record)
        return {"success": True, "oid": group_oid, "old_name": current_name, "new_name": effective_name, "description": new_description}

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
            return {"success": True, "oid": oid, "name": group_name, "description": create_data.description}

    async def delete_group(self, connection_id: int, group_oid: int) -> dict:
        connection = await self.get_connection(connection_id)
        if not connection:
            raise ValueError("Подключение не найдено")
        if group_oid <= 0:
            raise ValueError("Недопустимый OID группы")
        deleted_from_internal = False
        deleted_from_external = False
        group_name = None
        try:
            result = await self.db.execute(select(DB_Group_User).where(DB_Group_User.connection_id == connection_id, DB_Group_User.oid == group_oid, DB_Group_User.type.is_(True)))
            db_group_record = result.scalar_one_or_none()
            if db_group_record:
                await self.db.delete(db_group_record)
                await self.db.commit()
                deleted_from_internal = True
            async with external_db_connection(connection) as conn:
                row = await conn.fetchrow("""
                    SELECT rolname
                    FROM pg_roles
                    WHERE oid = $1
                      AND rolcanlogin = false
                      AND rolname !~ '^pg_'
                """, group_oid)
                if not row:
                    return {
                        "success": True,
                        "oid": group_oid,
                        "deleted_from_internal": deleted_from_internal,
                        "deleted_from_external": False,
                        "message": "Группа не найдена во внешней БД, но удалена из внутренней БД" if deleted_from_internal else ""
                    }
                group_name = row["rolname"]
                try:
                    await conn.execute(f'DROP OWNED BY "{group_name}" CASCADE')
                    await conn.execute(f'DROP ROLE "{group_name}"')
                    deleted_from_external = True
                    return {
                        "success": True,
                        "oid": group_oid,
                        "name": group_name,
                        "deleted_from_internal": deleted_from_internal,
                        "deleted_from_external": deleted_from_external,
                        "message": f"Группа '{group_name}' успешно удалена"
                    }
                except Exception as e:
                    error_msg = str(e)
                    if "does not exist" in error_msg or "could not find role" in error_msg:
                        return {
                            "success": True,
                            "oid": group_oid,
                            "name": group_name,
                            "deleted_from_internal": deleted_from_internal,
                            "deleted_from_external": False,
                            "message": f"Группа '{group_name}' уже удалена из внешней БД" +
                                       (", удалена из внутренней БД" if deleted_from_internal else "")
                        }
                    else:
                        return {
                            "success": False,
                            "oid": group_oid,
                            "name": group_name,
                            "deleted_from_internal": deleted_from_internal,
                            "deleted_from_external": False,
                            "error": f"Не удалось удалить группу из внешней БД: {error_msg}"
                        }
        except Exception as e:
            try:
                await self.db.rollback()
            except:
                pass
            check_result = await self.db.execute(
                select(DB_Group_User).where(DB_Group_User.connection_id == connection_id, DB_Group_User.oid == group_oid, DB_Group_User.type.is_(True)))
            still_exists = check_result.scalar_one_or_none() is not None
            raise Exception(f"Ошибка при удалении группы: {str(e)}. Запись во внутренней БД: {'существует' if still_exists else 'не существует'}")
