# backend/services/db_users_services.py
import math
from typing import Optional
from sqlalchemy import select, delete, func
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models.db import DB_Connection, DB_User
from backend.schemas.db_users_schemas import DBUserOut, PaginatedDBUsersResponse
from backend.utils.external_db import external_db_connection


class DBUserService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_connection(self, connection_id: int) -> DB_Connection | None:
        result = await self.db.execute(select(DB_Connection).where(DB_Connection.id == connection_id))
        return result.scalar_one_or_none()

    async def sync_users_from_external_db(self, connection_id: int) -> None:
        connection = await self.get_connection(connection_id)
        if not connection:
            raise ValueError("Подключение не найдено")
        external_users = {}
        async with external_db_connection(connection) as conn:
            rows = await conn.fetch("""
                SELECT
                    r.oid,
                    r.rolname AS name,
                    pg_catalog.shobj_description(r.oid, 'pg_authid') AS description
                FROM pg_roles r
                WHERE r.rolcanlogin = true
                  AND r.rolname !~ '^pg_'
                ORDER BY r.rolname
            """)
            for row in rows:
                external_users[row["oid"]] = {"oid": row["oid"], "name": row["name"], "description": row["description"] or None}
        result = await self.db.execute(select(DB_User).where(DB_User.connection_id == connection_id))
        local_users = {user.oid: user for user in result.scalars().all()}
        for oid, ext_user in external_users.items():
            local_user = local_users.get(oid)
            if local_user:
                changed = (local_user.name != ext_user["name"] or local_user.description != ext_user["description"])
                if changed:
                    local_user.name = ext_user["name"]
                    local_user.description = ext_user["description"]
                    self.db.add(local_user)
                del local_users[oid]
            else:
                new_user = DB_User(connection_id=connection_id, oid=ext_user["oid"], name=ext_user["name"], description=ext_user["description"], )
                self.db.add(new_user)
        if local_users:
            oids_to_delete = list(local_users.keys())
            await self.db.execute(delete(DB_User).where(DB_User.connection_id == connection_id, DB_User.oid.in_(oids_to_delete)))
        await self.db.commit()

    async def list_users(self, connection_id: int, page: int = 1, size: int = 20, search: Optional[str] = None) -> PaginatedDBUsersResponse:
        await self.sync_users_from_external_db(connection_id)
        query = select(DB_User).where(DB_User.connection_id == connection_id)
        count_stmt = select(func.count(DB_User.id)).where(DB_User.connection_id == connection_id)
        if search and search.strip():
            term = f"%{search.strip()}%"
            condition = (DB_User.name.ilike(term)) | (DB_User.description.ilike(term))
            query = query.where(condition)
            count_stmt = count_stmt.where(condition)
        total = (await self.db.execute(count_stmt)).scalar_one()
        offset = (page - 1) * size
        result = await self.db.execute(query.order_by(DB_User.name).offset(offset).limit(size))
        users = result.scalars().all()
        items = [DBUserOut(oid=user.oid, name=user.name, description=user.description, email=user.email) for user in users]
        pages = math.ceil(total / size) if size > 0 and total > 0 else 1
        return PaginatedDBUsersResponse(items=items, total=total, page=page, size=size, pages=pages, has_next=page < pages, has_prev=page > 1)

    async def get_user(self, connection_id: int, user_oid: int) -> DBUserOut:
        await self.sync_users_from_external_db(connection_id)
        result = await self.db.execute(select(DB_User).where(DB_User.connection_id == connection_id, DB_User.oid == user_oid))
        user = result.scalar_one_or_none()
        if not user:
            raise ValueError(f"Пользователь с OID {user_oid} не найден")
        return DBUserOut(oid=user.oid, name=user.name, description=user.description, email=user.email)

    async def create_user(self, connection_id: int, username: str, password: str, description: Optional[str] = None, email: Optional[str] = None) -> DBUserOut:
        connection = await self.get_connection(connection_id)
        if not connection:
            raise ValueError("Подключение не найдено")
        async with external_db_connection(connection) as conn:
            exists_row = await conn.fetchrow("SELECT 1 FROM pg_roles WHERE rolname = $1", username)
            if exists_row:
                raise ValueError(f"Пользователь с именем '{username}' уже существует во внешней базе")
            quoted_password = await conn.fetchval("SELECT quote_literal($1)", password)
            create_sql = f'CREATE ROLE "{username}" WITH LOGIN PASSWORD {quoted_password}'
            await conn.execute(create_sql)
            if description is not None:
                quoted_desc = await conn.fetchval("SELECT quote_literal($1)", description)
                comment_sql = f'COMMENT ON ROLE "{username}" IS {quoted_desc}'
                await conn.execute(comment_sql)
        await self.sync_users_from_external_db(connection_id)
        result = await self.db.execute(select(DB_User).where(DB_User.connection_id == connection_id, DB_User.name == username))
        user = result.scalar_one_or_none()
        if not user:
            raise RuntimeError("Не удалось найти только что созданного пользователя после синхронизации")
        if email != user.email:
            user.email = email
            self.db.add(user)
            await self.db.commit()
            await self.db.refresh(user)
        return DBUserOut(oid=user.oid, name=user.name, description=user.description, email=user.email)

    async def update_user(self, connection_id: int, user_oid: int, password: Optional[str] = None, description: Optional[str] = None, email: Optional[str] = None) -> DBUserOut:
        connection = await self.get_connection(connection_id)
        if not connection:
            raise ValueError("Подключение не найдено")
        result = await self.db.execute(select(DB_User).where(DB_User.connection_id == connection_id, DB_User.oid == user_oid))
        local_user = result.scalar_one_or_none()
        if not local_user:
            raise ValueError(f"Пользователь с OID {user_oid} не найден")
        username = local_user.name
        async with external_db_connection(connection) as conn:
            if password is not None:
                quoted_password = await conn.fetchval("SELECT quote_literal($1)", password)
                alter_sql = f'ALTER ROLE "{username}" PASSWORD {quoted_password}'
                await conn.execute(alter_sql)
            current_desc = await conn.fetchval("SELECT pg_catalog.shobj_description($1, 'pg_authid')", user_oid)
            if description is not None and description != current_desc:
                quoted_desc = await conn.fetchval("SELECT quote_literal($1)", description)
                comment_sql = f'COMMENT ON ROLE "{username}" IS {quoted_desc}'
                await conn.execute(comment_sql)
            elif description is None and current_desc is not None:
                await conn.execute(f'COMMENT ON ROLE "{username}" IS NULL')
        await self.sync_users_from_external_db(connection_id)
        result = await self.db.execute(select(DB_User).where(DB_User.connection_id == connection_id, DB_User.oid == user_oid))
        updated_user = result.scalar_one_or_none()
        if not updated_user:
            raise RuntimeError("Пользователь исчез после синхронизации")
        if email is not None and email != updated_user.email:
            updated_user.email = email
            self.db.add(updated_user)
            await self.db.commit()
            await self.db.refresh(updated_user)
        return DBUserOut(oid=updated_user.oid, name=updated_user.name, description=updated_user.description, email=updated_user.email)

    async def delete_user(self, connection_id: int, user_oid: int) -> None:
        connection = await self.get_connection(connection_id)
        if not connection:
            raise ValueError("Подключение не найдено")
        result = await self.db.execute(select(DB_User).where(DB_User.connection_id == connection_id, DB_User.oid == user_oid))
        local_user = result.scalar_one_or_none()
        if not local_user:
            raise ValueError(f"Пользователь с OID {user_oid} не найден в локальной базе")
        username = local_user.name
        if username.lower() in {"postgres", "admin", "root"}:
            raise ValueError("Удаление системной роли запрещено")
        async with external_db_connection(connection) as conn:
            exists = await conn.fetchval("SELECT EXISTS(SELECT 1 FROM pg_roles WHERE rolname = $1)", username)
            if exists:
                try:
                    drop_sql = f'DROP ROLE IF EXISTS "{username}"'
                    await conn.execute(drop_sql)
                except Exception as e:
                    error_msg = str(e).lower()
                    if "required by other objects" in error_msg or "dependent objects" in error_msg:
                        raise ValueError(f"Невозможно удалить роль '{username}': существуют зависимые объекты, удалите зависимости вручную.")
                    else:
                        raise
        await self.db.execute(delete(DB_User).where(DB_User.connection_id == connection_id, DB_User.oid == user_oid))
        await self.db.commit()
