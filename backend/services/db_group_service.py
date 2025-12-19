import re

import asyncpg
from typing import List, Dict, Any, Optional, Set
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from backend.models.db import DB_Connection, DB_Group
from backend.core.security import decrypt_password


class DBGroupService:
    """Группы из подключенных баз данных"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_db_connection(self, connection: DB_Connection, query: str, *params) -> List[asyncpg.Record]:
        """Подключение к внешней БД"""
        password = decrypt_password(connection.password)
        conn = await asyncpg.connect(
            host=connection.host,
            port=connection.port,
            user=connection.username,
            password=password,
            database=connection.database_name,
            timeout=10,
        )
        rows = await conn.fetch(query, *params)
        await conn.close()
        return rows

    async def get_groups_from_database(self, connection: DB_Connection) -> List[Dict[str, Any]]:
        """Получить группы из подключенной БД"""
        try:
            sql_query = """
            SELECT
                r.rolname AS name,
                pg_catalog.shobj_description(r.oid, 'pg_authid') AS external_description,
                COUNT(m.member) AS user_count
            FROM pg_catalog.pg_roles r
            LEFT JOIN pg_catalog.pg_auth_members m ON m.roleid = r.oid
            WHERE r.rolcanlogin = false
            GROUP BY r.oid, r.rolname
            ORDER BY r.rolname;
            """
            rows = await self._get_db_connection(connection, sql_query)
            return [
                {
                    "name": row["name"],
                    "external_description": row["external_description"],
                    "user_count": row["user_count"]
                }
                for row in rows
            ]
        except Exception as e:
            raise Exception(f"Ошибка при получении групп из базы данных: {str(e)}")

    async def _get_connection_and_groups(self, connection_id: int) -> tuple[DB_Connection, List[DB_Group]]:
        """Получить подключение и его группы"""
        result = await self.db.execute(select(DB_Connection).where(DB_Connection.id == connection_id))
        connection = result.scalar_one_or_none()
        if not connection:
            raise ValueError(f"Подключение с ID {connection_id} не найдено")
        result = await self.db.execute(select(DB_Group).where(DB_Group.connection_id == connection_id))
        groups = result.scalars().all()
        return connection, groups

    async def check_if_sync_needed(self, connection_id: int) -> Dict[str, Any]:
        """Проверка необходимости синхронизации"""
        try:
            connection, local_groups = await self._get_connection_and_groups(connection_id)
            external_groups = await self.get_groups_from_database(connection)
            external_names = {g["name"] for g in external_groups}
            local_names = {g.name for g in local_groups}
            new_groups = external_names - local_names
            missing_groups = local_names - external_names
            data_differences = []
            local_dict = {g.name: g for g in local_groups}
            external_dict = {g["name"]: g for g in external_groups}
            for name in external_names & local_names:
                local = local_dict[name]
                external = external_dict[name]
                user_count_diff = local.user_count != external["user_count"]
                description_diff = self._check_description_difference(local, external)
                if user_count_diff or description_diff:
                    data_differences.append({
                        "name": name,
                        "user_count_diff": user_count_diff,
                        "description_diff": description_diff,
                        "local_user_count": local.user_count,
                        "external_user_count": external["user_count"],
                        "local_description": local.description,
                        "external_description": external["external_description"]
                    })
            needs_sync = bool(new_groups or missing_groups or data_differences)

            return {
                "connection_id": connection_id,
                "connection_name": connection.name,
                "needs_sync": needs_sync,
                "comparison": {
                    "external_count": len(external_groups),
                    "local_count": len(local_groups),
                    "new_groups": list(new_groups),
                    "missing_groups": list(missing_groups),
                    "data_differences": data_differences,
                    "total_differences": (len(new_groups) + len(missing_groups) + len(data_differences))
                }
            }
        except Exception as e:
            return {
                "connection_id": connection_id,
                "connection_name": "unknown",
                "needs_sync": True,
                "error": str(e),
                "comparison": self._empty_comparison()
            }

    def _check_description_difference(self, local: DB_Group, external: Dict) -> bool:
        """Проверить разницу в описаниях"""
        if local.description and external["external_description"]:
            return local.description != external["external_description"]
        if not local.description and external["external_description"]:
            return True
        return False

    def _empty_comparison(self) -> Dict[str, Any]:
        """Пустой результат сравнения"""
        return {
            "external_count": 0,
            "local_count": 0,
            "new_groups": [],
            "missing_groups": [],
            "data_differences": [],
            "total_differences": 0
        }

    async def smart_sync_groups_for_connection(self, connection_id: int) -> Dict[str, Any]:
        """Умная синхронизация групп"""
        connection, existing_groups = await self._get_connection_and_groups(connection_id)
        try:
            external_groups = await self.get_groups_from_database(connection)
            existing_dict = {g.name: g for g in existing_groups}
            stats = {"added": 0, "updated": 0, "deleted": 0, "unchanged": 0}
            added = []
            updated = []
            for ext in external_groups:
                if ext["name"] in existing_dict:
                    stats, update_info = await self._update_existing_group(
                        existing_dict[ext["name"]], ext, stats
                    )
                    if update_info:
                        updated.append(update_info)
                else:
                    stats = await self._add_new_group(ext, connection_id, stats)
                    added.append({"name": ext["name"], "user_count": ext["user_count"], "description": ext["external_description"]})
            await self.db.commit()
            external_names = {g["name"] for g in external_groups}
            deleted_groups = await self._delete_obsolete_groups(existing_groups, external_names)
            stats["deleted"] = len(deleted_groups)
            return {
                "connection_id": connection_id,
                "connection_name": connection.name,
                "total_external_groups": len(external_groups),
                "sync_statistics": {**stats, "total_after_sync": len(external_groups)},
                "added_groups": added,
                "updated_groups": updated,
                "deleted_groups": deleted_groups,
                "has_changes": any(stats[key] for key in ["added", "updated", "deleted"]),
            }
        except Exception as e:
            await self.db.rollback()
            raise Exception(f"Ошибка при умной синхронизации групп: {str(e)}")

    async def _update_existing_group(self, existing: DB_Group, external: Dict, stats: Dict) -> tuple[Dict, Optional[Dict]]:
        """Обновить существующую группу"""
        user_count_changed = existing.user_count != external["user_count"]
        new_description = self._determine_new_description(existing, external)
        needs_update = user_count_changed or (new_description != existing.description)
        if needs_update:
            if user_count_changed:
                existing.user_count = external["user_count"]
            if new_description != existing.description:
                existing.description = new_description
            stats["updated"] += 1
            return stats, {
                "name": existing.name,
                "user_count_changed": user_count_changed,
                "description_changed": new_description != existing.description,
                "old_user_count": None if not user_count_changed else existing.user_count,
                "new_user_count": external["user_count"] if user_count_changed else None,
                "old_description": None,
                "new_description": new_description,
            }
        else:
            stats["unchanged"] += 1
            return stats, None

    def _determine_new_description(self, existing: DB_Group, external: Dict) -> Optional[str]:
        """Определить новое описание группы"""
        if existing.description:
            return existing.description
        if external["external_description"]:
            return external["external_description"]
        return None

    async def _add_new_group(self, external: Dict, connection_id: int, stats: Dict) -> Dict:
        """Добавить новую группу"""
        db_group = DB_Group(name=external["name"], description=external["external_description"], user_count=external["user_count"], connection_id=connection_id)
        self.db.add(db_group)
        stats["added"] += 1
        return stats

    async def _delete_obsolete_groups(self, existing_groups: List[DB_Group], external_names: Set[str]) -> List[Dict]:
        """Удалить устаревшие группы"""
        deleted = []
        for group in existing_groups:
            if group.name not in external_names:
                await self.db.delete(group)
                deleted.append({"name": group.name, "description": group.description, "user_count": group.user_count})
        if deleted:
            await self.db.commit()
        return deleted

    async def get_or_sync_groups_by_connection(self, connection_id: int) -> Dict[str, Any]:
        """Получить группы из локальной БД (без синхронизации)"""
        connection, _ = await self._get_connection_and_groups(connection_id)
        result = await self.db.execute(
            select(DB_Group)
            .where(DB_Group.connection_id == connection_id)
            .order_by(DB_Group.name)
        )
        groups = result.scalars().all()
        return {
            "connection_id": connection_id,
            "connection_name": connection.name,
            "total_groups": len(groups),
            "groups": [
                {
                    "id": g.id,
                    "name": g.name,
                    "description": g.description,
                    "user_count": g.user_count,
                    "created_at": g.created_at,
                    "updated_at": g.updated_at
                }
                for g in groups
            ]
        }

    async def force_sync_groups_for_connection(self, connection_id: int) -> Dict[str, Any]:
        """Принудительная синхронизация групп"""
        connection, old_groups = await self._get_connection_and_groups(connection_id)
        try:
            external_groups = await self.get_groups_from_database(connection)
            old_dict = {g.name: g for g in old_groups}
            await self.db.execute(delete(DB_Group).where(DB_Group.connection_id == connection_id))
            created = []
            preserved = 0
            for ext in external_groups:
                description = (
                    old_dict[ext["name"]].description
                    if ext["name"] in old_dict and old_dict[ext["name"]].description
                    else ext["external_description"]
                )
                if ext["name"] in old_dict and old_dict[ext["name"]].description:
                    preserved += 1
                db_group = DB_Group(name=ext["name"], description=description, user_count=ext["user_count"], connection_id=connection_id)
                self.db.add(db_group)
                created.append({
                    "name": ext["name"],
                    "user_count": ext["user_count"],
                    "description": description,
                    "description_source": "preserved" if description and ext["name"] in old_dict and old_dict[ext["name"]].description else "external"})
            await self.db.commit()
            return {
                "connection_id": connection_id,
                "connection_name": connection.name,
                "total_groups_synced": len(created),
                "old_groups_count": len(old_groups),
                "new_groups_count": len(created),
                "preserved_descriptions_count": preserved,
                "groups": created
            }
        except Exception as e:
            await self.db.rollback()
            raise Exception(f"Ошибка при принудительной синхронизации групп: {str(e)}")

    async def update_group(self, group_id: int, name: Optional[str] = None, description: Optional[str] = None) -> Dict[str, Any]:
        """Обновить группу, поле`description` обновляется локально, поле `name` обновляется во внешней БД (через ALTER ROLE), и локально"""
        result = await self.db.execute(select(DB_Group).where(DB_Group.id == group_id))
        group = result.scalar_one_or_none()
        if not group:
            raise ValueError(f"Группа с ID {group_id} не найдена")
        connection = await self.db.get(DB_Connection, group.connection_id)
        if not connection:
            raise ValueError("Подключение не найдено")
        update_info = {"group_id": group_id, "changes": {}}
        if description is not None and description != group.description:
            group.description = description
            update_info["changes"]["description"] = {"old": group.description, "new": description}
        if name is not None and name != group.name:
            name = name.strip()
            if not name:
                raise ValueError("Имя группы не может быть пустым")
            if not re.match(r"^[a-zA-Z0-9_]+$", name):
                raise ValueError("Имя группы может содержать только буквы, цифры и символ подчёркивания _")
            external_groups = await self.get_groups_from_database(connection)
            external_names = {g["name"] for g in external_groups}
            if name in external_names:
                raise ValueError(f"Имя группы '{name}' уже существует во внешней базе данных")
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
                old_name = group.name
                if '"' in old_name or '"' in name:
                    await conn.close()
                    raise ValueError("Имя роли не должно содержать кавычки")
                sql = f'ALTER ROLE "{old_name}" RENAME TO "{name}"'
                await conn.execute(sql)
                await conn.close()
            except Exception as e:
                if 'conn' in locals():
                    await conn.close()
                raise Exception(f"Ошибка при переименовании роли во внешней БД: {str(e)}")
            old_name_local = group.name
            group.name = name
            update_info["changes"]["name"] = {"old": old_name_local, "new": name}
            try:
                external_groups_after = await self.get_groups_from_database(connection)
                ext_group = next((g for g in external_groups_after if g["name"] == name), None)
                if ext_group:
                    group.user_count = ext_group["user_count"]
            except Exception:
                pass
        self.db.add(group)
        await self.db.commit()
        await self.db.refresh(group)
        return {
            "id": group.id,
            "name": group.name,
            "description": group.description,
            "user_count": group.user_count,
            "updated_at": group.updated_at,
            "changes_applied": update_info["changes"]
        }

    async def create_group(self, connection_id: int, name: str, description: Optional[str] = None) -> Dict[str, Any]:
        """Создать группу (роль)"""
        name = name.strip()
        if not name:
            raise ValueError("Имя группы не может быть пустым")
        if not re.match(r"^[a-zA-Z0-9_]+$", name):
            raise ValueError("Имя группы может содержать только латинские буквы, цифры и символ подчёркивания '_'")
        result = await self.db.execute(select(DB_Connection).where(DB_Connection.id == connection_id))
        connection = result.scalar_one_or_none()
        if not connection:
            raise ValueError(f"Подключение с ID {connection_id} не найдено")
        external_groups = await self.get_groups_from_database(connection)
        external_names = {g["name"] for g in external_groups}
        if name in external_names:
            raise ValueError(f"Группа с именем '{name}' уже существует во внешней базе данных")
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
            sql = f'CREATE ROLE "{name}" NOLOGIN'
            await conn.execute(sql)
            await conn.close()
        except Exception as e:
            if 'conn' in locals():
                await conn.close()
            raise Exception(f"Ошибка при создании роли во внешней БД: {str(e)}")
        db_group = DB_Group(
            name=name,
            description=description,
            user_count=0,
            connection_id=connection_id
        )
        self.db.add(db_group)
        await self.db.commit()
        await self.db.refresh(db_group)
        return {
            "id": db_group.id,
            "name": db_group.name,
            "description": db_group.description,
            "user_count": db_group.user_count,
            "created_at": db_group.created_at,
            "updated_at": db_group.updated_at
        }

    async def delete_group(self, group_id: int) -> Dict[str, Any]:
        """Удалить группу"""
        result = await self.db.execute(select(DB_Group).where(DB_Group.id == group_id))
        group = result.scalar_one_or_none()
        if not group:
            raise ValueError(f"Группа с ID {group_id} не найдена")
        connection_id = group.connection_id
        group_name = group.name
        conn_result = await self.db.execute(select(DB_Connection).where(DB_Connection.id == connection_id))
        connection = conn_result.scalar_one_or_none()
        if not connection:
            raise ValueError("Подключение не найдено")
        await self.smart_sync_groups_for_connection(connection_id)
        external_groups = await self.get_groups_from_database(connection)
        external_names = {g["name"] for g in external_groups}
        if group_name not in external_names:
            raise ValueError(f"Группа '{group_name}' не существует во внешней базе данных")
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
            sql = f'DROP ROLE IF EXISTS "{group_name}"'
            await conn.execute(sql)
            await conn.close()
        except Exception as e:
            if 'conn' in locals():
                await conn.close()
            raise Exception(f"Ошибка при удалении роли из внешней БД: {str(e)}")
        await self.db.execute(delete(DB_Group).where(DB_Group.id == group_id))
        await self.db.commit()
        return {
            "message": f"Группа '{group_name}' успешно удалена из внешней и локальной баз данных",
            "deleted_group_id": group_id,
            "group_name": group_name,
            "connection_id": connection_id,
        }