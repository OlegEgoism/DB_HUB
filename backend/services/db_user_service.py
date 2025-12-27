# backend/services/db_user_service.py
import asyncpg
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.models.db import DB_Connection, DB_User
from backend.core.security import decrypt_password


class DBUserService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _fetch_users_from_external_db(self, connection: DB_Connection) -> List[Dict[str, Any]]:
        """Получает login-пользователей из внешней PostgreSQL БД с rolsuper флагом"""
        try:
            password = decrypt_password(connection.password)
            conn = await asyncpg.connect(
                host=connection.host,
                port=connection.port,
                user=connection.username,
                password=password,
                database=connection.database_name,
                timeout=10,
            )
            query = """
                SELECT
                    r.oid,
                    r.rolname AS username,
                    r.rolsuper
                FROM pg_catalog.pg_roles r
                WHERE r.rolcanlogin = true
                ORDER BY r.rolname;
            """
            rows = await conn.fetch(query)
            await conn.close()
            return [
                {
                    "oid": row["oid"],
                    "username": row["username"],
                    "rolsuper": row["rolsuper"]  # ← добавлено
                }
                for row in rows
            ]
        except Exception as e:
            raise Exception(f"Ошибка при получении пользователей из внешней БД: {str(e)}")

    async def smart_sync_users_for_connection(self, connection_id: int) -> Dict[str, Any]:
        """Умная синхронизация: сохраняем только oid и username; email и description сбрасываются в None при замене"""
        connection_result = await self.db.execute(select(DB_Connection).where(DB_Connection.id == connection_id))
        connection = connection_result.scalar_one_or_none()
        if not connection:
            raise ValueError(f"Подключение с ID {connection_id} не найдено")

        external_users = await self._fetch_users_from_external_db(connection)
        local_result = await self.db.execute(select(DB_User).where(DB_User.connection_id == connection_id))
        local_users = local_result.scalars().all()

        local_by_oid = {u.oid: u for u in local_users}
        local_by_username = {u.username: u for u in local_users}
        external_oids = {u["oid"] for u in external_users}

        stats = {"added": 0, "updated": 0, "deleted": 0}
        added, updated, deleted = [], [], []

        # === Удаление локальных пользователей, отсутствующих во внешней БД по OID ===
        for local in local_users:
            if local.oid not in external_oids:
                if local.username in [u["username"] for u in external_users]:
                    ext = next(u for u in external_users if u["username"] == local.username)
                    if ext["oid"] != local.oid:
                        # OID изменился → удаляем старую запись
                        await self.db.delete(local)
                        deleted.append({"oid": local.oid, "username": local.username, "reason": "oid_changed_same_username"})
                        stats["deleted"] += 1
                        continue
                # Пользователь реально удалён
                await self.db.delete(local)
                deleted.append({"oid": local.oid, "username": local.username, "reason": "deleted_from_external"})
                stats["deleted"] += 1

        # Перечитываем текущие записи
        fresh_result = await self.db.execute(select(DB_User).where(DB_User.connection_id == connection_id))
        current_users = fresh_result.scalars().all()
        current_by_oid = {u.oid: u for u in current_users}
        current_by_username = {u.username: u for u in current_users}

        # === Обработка внешних пользователей ===
        for ext in external_users:
            ext_oid = ext["oid"]
            ext_username = ext["username"]

            if ext_oid in current_by_oid:
                # OID совпадает → обновляем только username
                local = current_by_oid[ext_oid]
                if local.username != ext_username:
                    local.username = ext_username
                    self.db.add(local)
                    updated.append({"oid": ext_oid, "old_username": local.username, "new_username": ext_username})
                    stats["updated"] += 1
                # email, description НЕ обновляются

            elif ext_username in current_by_username:
                # Username совпадает, OID другой → замена
                old = current_by_username[ext_username]
                await self.db.delete(old)
                deleted.append({"oid": old.oid, "username": old.username, "reason": "replaced_due_to_oid_change"})
                stats["deleted"] += 1

                new_user = DB_User(
                    oid=ext_oid,
                    username=ext_username,
                    description=None,
                    email=None,
                    connection_id=connection_id
                )
                self.db.add(new_user)
                added.append({"oid": ext_oid, "username": ext_username, "reason": "username_preserved_new_oid_clean"})
                stats["added"] += 1

            else:
                # Новый пользователь
                new_user = DB_User(
                    oid=ext_oid,
                    username=ext_username,
                    description=None,
                    email=None,
                    connection_id=connection_id
                )
                self.db.add(new_user)
                added.append({"oid": ext_oid, "username": ext_username, "reason": "new_user_clean"})
                stats["added"] += 1

        await self.db.commit()

        return {
            "connection_id": connection_id,
            "connection_name": connection.name,
            "total_external_users": len(external_users),
            "sync_statistics": stats,
            "added_users": added,
            "updated_users": updated,
            "deleted_users": deleted,
            "has_changes": any(stats.values())
        }

    async def get_users_with_sync(self, connection_id: int) -> Dict[str, Any]:
        """Возвращает пользователей с полем rolsuper из внешней БД"""
        await self.smart_sync_users_for_connection(connection_id)

        # Получаем внешние данные с rolsuper
        connection_result = await self.db.execute(select(DB_Connection).where(DB_Connection.id == connection_id))
        connection = connection_result.scalar_one_or_none()
        if not connection:
            raise ValueError("Подключение не найдено")

        external_users = await self._fetch_users_from_external_db(connection)
        external_by_oid = {u["oid"]: u for u in external_users}

        # Получаем локальных пользователей
        local_result = await self.db.execute(
            select(DB_User)
            .where(DB_User.connection_id == connection_id)
            .order_by(DB_User.username)
        )
        local_users = local_result.scalars().all()

        user_list = []
        for u in local_users:
            ext = external_by_oid.get(u.oid)
            user_list.append({
                "id": u.id,
                "oid": u.oid,
                "username": u.username,
                "description": u.description,
                "email": u.email,
                "created_at": u.created_at,
                "updated_at": u.updated_at,
                "rolsuper": ext["rolsuper"] if ext else False  # ← реальное значение из внешней БД
            })

        return {
            "connection_id": connection_id,
            "total_users": len(user_list),
            "users": user_list
        }