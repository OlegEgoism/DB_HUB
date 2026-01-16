# backend/services/db_users_services.py
import math
from typing import Optional, List
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
        if search and search.strip():
            term = f"%{search.strip()}%"
            query = query.where((DB_User.name.ilike(term)) | (DB_User.description.ilike(term)))
        query = query.order_by(DB_User.name)
        count_query = select(DB_User).where(DB_User.connection_id == connection_id)
        if search and search.strip():
            count_query = count_query.where((DB_User.name.ilike(term)) | (DB_User.description.ilike(term)))
        total_result = await self.db.execute(select(func.count()).select_from(count_query.subquery()))
        total = total_result.scalar_one()
        offset = (page - 1) * size
        result = await self.db.execute(query.offset(offset).limit(size))
        users = result.scalars().all()
        items = [DBUserOut(oid=user.oid, name=user.name, description=user.description) for user in users]
        pages = math.ceil(total / size) if size > 0 and total > 0 else 1
        return PaginatedDBUsersResponse(items=items, total=total, page=page, size=size, pages=pages, has_next=page < pages, has_prev=page > 1)

    async def get_user(self, connection_id: int, user_oid: int) -> DBUserOut:
        await self.sync_users_from_external_db(connection_id)
        result = await self.db.execute(select(DB_User).where(DB_User.connection_id == connection_id, DB_User.oid == user_oid))
        user = result.scalar_one_or_none()
        if not user:
            raise ValueError(f"Пользователь с OID {user_oid} не найден")
        return DBUserOut(oid=user.oid, name=user.name, description=user.description)
