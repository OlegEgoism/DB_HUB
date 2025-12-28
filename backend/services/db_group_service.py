# backend/services/db_group_service.py
import re
import asyncpg
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from backend.models.db import DB_Connection, DB_Group
from backend.core.security import decrypt_password

FORBIDDEN_ROLE_NAMES = {
    # Системные роли и шаблоны
    "pg_database_owner",
    "pg_signal_backend",
    "pg_read_all_data",
    "pg_write_all_data",
    "pg_read_all_settings",
    "pg_read_all_stats",
    "pg_stat_scan_tables",
    "pg_monitor",
    "pg_read_server_files",
    "pg_write_server_files",
    "pg_execute_server_program",
    "postgres",
    "current_user",
    "session_user",
    "public",
    # Общие SQL-ключевые слова
    "select", "insert", "update", "delete", "create", "drop", "alter",
    "grant", "revoke", "user", "role", "group", "table", "schema",
    "database", "function", "procedure", "trigger", "view", "index",
    "sequence", "default", "null", "true", "false", "and", "or", "not",
    "exists", "in", "between", "like", "any", "all", "some",
    "order", "group", "by", "having", "where", "from", "join", "on",
    "as", "into", "values", "set", "show", "use", "explain", "analyze",
    "begin", "commit", "rollback", "transaction", "savepoint",
    "if", "then", "else", "end", "case", "when", "loop", "while",
    "for", "do", "declare", "execute", "call", "return", "returns"
}
FORBIDDEN_ROLE_NAMES = {name.lower() for name in FORBIDDEN_ROLE_NAMES}


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
                r.oid,
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
                    "oid": row["oid"],
                    "name": row["name"],
                    "external_description": row["external_description"],
                    "user_count": row["user_count"]
                }
                for row in rows
            ]
        except Exception as e:
            raise Exception(f"Ошибка при получении групп из базы данных: {str(e)}")

    async def _get_connection_and_groups(self, connection_id: int) -> tuple[DB_Connection, List[DB_Group]]:
        result = await self.db.execute(select(DB_Connection).where(DB_Connection.id == connection_id))
        connection = result.scalar_one_or_none()
        if not connection:
            raise ValueError(f"Подключение с ID {connection_id} не найдено")
        result = await self.db.execute(select(DB_Group).where(DB_Group.connection_id == connection_id))
        groups = result.scalars().all()
        return connection, groups

    async def smart_sync_groups_for_connection(self, connection_id: int) -> Dict[str, Any]:
        """Умная синхронизация: сопоставление по OID и имени с корректной обработкой изменений OID при неизменном имени"""
        connection, existing_groups = await self._get_connection_and_groups(connection_id)
        try:
            external_groups = await self.get_groups_from_database(connection)

            # Индексы
            existing_by_oid = {g.oid: g for g in existing_groups}
            existing_by_name = {g.name: g for g in existing_groups}
            external_oids = {g["oid"] for g in external_groups}

            stats = {"added": 0, "updated": 0, "deleted": 0, "unchanged": 0}
            added = []
            updated = []
            deleted_groups = []

            # === Шаг 1: Удаляем локальные группы, которых нет во внешней БД по OID ===
            for local in existing_groups:
                if local.oid not in external_oids:
                    # Возможно, группа пересоздана с новым OID — проверим по имени
                    if local.name in existing_by_name and local.name in [g["name"] for g in external_groups]:
                        # Группа с таким именем есть во внешней БД, но с другим OID → пересоздана
                        external_with_same_name = next(g for g in external_groups if g["name"] == local.name)
                        if external_with_same_name["oid"] != local.oid:
                            # Удаляем старую запись
                            await self.db.delete(local)
                            deleted_groups.append({
                                "oid": local.oid,
                                "name": local.name,
                                "description": local.description,
                                "reason": "oid_changed_same_name"
                            })
                            stats["deleted"] += 1
                            continue
                    # Иначе — группа реально удалена
                    await self.db.delete(local)
                    deleted_groups.append({
                        "oid": local.oid,
                        "name": local.name,
                        "description": local.description,
                        "reason": "deleted_from_external"
                    })
                    stats["deleted"] += 1

            # Обновим индексы после удаления (или просто перечитаем — безопаснее)
            result = await self.db.execute(select(DB_Group).where(DB_Group.connection_id == connection_id))
            current_groups = result.scalars().all()
            current_by_oid = {g.oid: g for g in current_groups}
            current_by_name = {g.name: g for g in current_groups}

            # === Шаг 2: Обрабатываем внешние группы ===
            for ext in external_groups:
                ext_oid = ext["oid"]
                ext_name = ext["name"]

                if ext_oid in current_by_oid:
                    # Случай 1: OID совпадает — обновляем name и description
                    local = current_by_oid[ext_oid]
                    changes = {}

                    if local.name != ext_name:
                        changes["name"] = {"old": local.name, "new": ext_name}
                        local.name = ext_name

                    new_desc = self._determine_new_description(local, ext)
                    if new_desc != local.description:
                        changes["description"] = {"old": local.description, "new": new_desc}
                        local.description = new_desc

                    if changes:
                        stats["updated"] += 1
                        updated.append({
                            "oid": ext_oid,
                            "name": ext_name,
                            "reason": "oid_match",
                            "changes": changes
                        })
                    else:
                        stats["unchanged"] += 1
                    self.db.add(local)

                elif ext_name in current_by_name:
                    # Случай 2: имя совпадает, но OID другой → заменяем запись
                    old_local = current_by_name[ext_name]
                    await self.db.delete(old_local)
                    deleted_groups.append({
                        "oid": old_local.oid,
                        "name": old_local.name,
                        "description": old_local.description,
                        "reason": "replaced_due_to_oid_change"
                    })
                    stats["deleted"] += 1

                    # Создаём новую запись
                    new_group = DB_Group(
                        oid=ext_oid,
                        name=ext_name,
                        description=ext["external_description"],
                        connection_id=connection_id
                    )
                    self.db.add(new_group)
                    added.append({
                        "oid": ext_oid,
                        "name": ext_name,
                        "description": ext["external_description"],
                        "reason": "name_preserved_new_oid"
                    })
                    stats["added"] += 1

                else:
                    # Случай 3: полностью новая группа
                    new_group = DB_Group(
                        oid=ext_oid,
                        name=ext_name,
                        description=ext["external_description"],
                        connection_id=connection_id
                    )
                    self.db.add(new_group)
                    added.append({
                        "oid": ext_oid,
                        "name": ext_name,
                        "description": ext["external_description"],
                        "reason": "new_group"
                    })
                    stats["added"] += 1

            await self.db.commit()

            return {
                "connection_id": connection_id,
                "connection_name": connection.name,
                "total_external_groups": len(external_groups),
                "sync_statistics": {
                    **stats,
                    "total_after_sync": len(external_groups)
                },
                "added_groups": added,
                "updated_groups": updated,
                "deleted_groups": deleted_groups,
                "has_changes": any(stats[key] for key in ["added", "updated", "deleted"]),
            }

        except Exception as e:
            await self.db.rollback()
            raise Exception(f"Ошибка при умной синхронизации групп: {str(e)}")

    def _determine_new_description(self, existing: Optional[DB_Group], external: Dict) -> Optional[str]:
        if existing and existing.description:
            return existing.description
        return external.get("external_description")

    async def check_if_sync_needed(self, connection_id: int) -> Dict[str, Any]:
        """Проверка необходимости синхронизации (используется только для UI)"""
        try:
            connection, local_groups = await self._get_connection_and_groups(connection_id)
            external_groups = await self.get_groups_from_database(connection)

            external_oids = {g["oid"] for g in external_groups}
            local_oids = {g.oid for g in local_groups}
            new_oids = external_oids - local_oids
            missing_oids = local_oids - external_oids

            # Проверка на изменения описания или имени при совпадающем OID
            local_dict = {g.oid: g for g in local_groups}
            external_dict = {g["oid"]: g for g in external_groups}
            data_diffs = []
            for oid in external_oids & local_oids:
                local = local_dict[oid]
                ext = external_dict[oid]
                if local.name != ext["name"] or local.description != ext["external_description"]:
                    data_diffs.append({
                        "oid": oid,
                        "name": ext["name"],
                        "local_name": local.name,
                        "local_desc": local.description,
                        "external_desc": ext["external_description"]
                    })

            needs_sync = bool(new_oids or missing_oids or data_diffs)
            return {
                "connection_id": connection_id,
                "connection_name": connection.name,
                "needs_sync": needs_sync,
                "comparison": {
                    "external_count": len(external_groups),
                    "local_count": len(local_groups),
                    "new_groups_count": len(new_oids),
                    "missing_groups_count": len(missing_oids),
                    "data_differences": data_diffs,
                    "total_differences": len(new_oids) + len(missing_oids) + len(data_diffs)
                }
            }
        except Exception as e:
            return {
                "connection_id": connection_id,
                "connection_name": "unknown",
                "needs_sync": True,
                "error": str(e),
                "comparison": {
                    "external_count": 0,
                    "local_count": 0,
                    "new_groups_count": 0,
                    "missing_groups_count": 0,
                    "data_differences": [],
                    "total_differences": 0
                }
            }

    # Остальные методы остаются без изменений, если не затронуты логикой
    async def get_or_sync_groups_by_connection(self, connection_id: int) -> Dict[str, Any]:
        connection, _ = await self._get_connection_and_groups(connection_id)
        result = await self.db.execute(
            select(DB_Group)
            .where(DB_Group.connection_id == connection_id)
            .order_by(DB_Group.name)
        )
        groups = result.scalars().all()
        external_groups = await self.get_groups_from_database(connection)
        external_by_name = {g["name"]: g["user_count"] for g in external_groups}

        return {
            "connection_id": connection_id,
            "connection_name": connection.name,
            "total_groups": len(groups),
            "groups": [
                {
                    "id": g.id,
                    "oid": g.oid,
                    "name": g.name,
                    "description": g.description,
                    "user_count": external_by_name.get(g.name, 0),
                    "created_at": g.created_at,
                    "updated_at": g.updated_at
                }
                for g in groups
            ]
        }

    # Остальные методы (create_group, update_group, delete_group, force_sync и т.д.) остаются без изменений,
    # так как они не связаны с общей логикой `smart_sync_groups_for_connection`.

    async def create_group(self, connection_id: int, name: str, description: Optional[str] = None) -> Dict[str, Any]:
        name = name.strip()
        if not name:
            raise ValueError("Имя группы не может быть пустым")
        if not re.match(r"^[a-zA-Z0-9_]+$", name):
            raise ValueError("Имя группы может содержать только латинские буквы, цифры и символ подчёркивания '_'")
        name_lower = name.lower()
        if name_lower in FORBIDDEN_ROLE_NAMES:
            raise ValueError(f"Имя группы '{name}' запрещено к использованию")
        if name_lower.startswith("pg_"):
            raise ValueError("Имена групп, начинающиеся с 'pg_', зарезервированы и не могут быть использованы")

        result = await self.db.execute(select(DB_Connection).where(DB_Connection.id == connection_id))
        connection = result.scalar_one_or_none()
        if not connection:
            raise ValueError(f"Подключение с ID {connection_id} не найдено")

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
            await conn.execute(f'CREATE ROLE "{name}" NOLOGIN')
            oid_result = await conn.fetchrow('SELECT oid FROM pg_roles WHERE rolname = $1', name)
            oid = oid_result['oid'] if oid_result else None
            await conn.close()
        except Exception as e:
            if 'conn' in locals():
                await conn.close()
            raise Exception(f"Ошибка при создании роли во внешней БД: {str(e)}")

        db_group = DB_Group(
            oid=oid,
            name=name,
            description=description,
            connection_id=connection_id
        )
        self.db.add(db_group)
        await self.db.commit()
        await self.db.refresh(db_group)

        return {
            "id": db_group.id,
            "oid": db_group.oid,
            "name": db_group.name,
            "description": db_group.description,
            "user_count": 0,
            "created_at": db_group.created_at,
            "updated_at": db_group.updated_at
        }

    async def update_group(self, group_id: int, name: Optional[str] = None, description: Optional[str] = None) -> Dict[str, Any]:
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

        self.db.add(group)
        await self.db.commit()
        await self.db.refresh(group)

        return {
            "id": group.id,
            "name": group.name,
            "description": group.description,
            "user_count": 0,
            "updated_at": group.updated_at,
            "changes_applied": update_info["changes"]
        }

    async def delete_group(self, group_id: int) -> Dict[str, Any]:
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

    async def force_sync_groups_for_connection(self, connection_id: int) -> Dict[str, Any]:
        connection, old_groups = await self._get_connection_and_groups(connection_id)
        try:
            external_groups = await self.get_groups_from_database(connection)
            old_by_oid = {g.oid: g for g in old_groups}

            await self.db.execute(delete(DB_Group).where(DB_Group.connection_id == connection_id))

            created = []
            preserved = 0
            for ext in external_groups:
                description = (
                    old_by_oid[ext["oid"]].description
                    if ext["oid"] in old_by_oid and old_by_oid[ext["oid"]].description
                    else ext["external_description"]
                )
                if ext["oid"] in old_by_oid and old_by_oid[ext["oid"]].description:
                    preserved += 1
                db_group = DB_Group(
                    oid=ext["oid"],
                    name=ext["name"],
                    description=description,
                    connection_id=connection_id
                )
                self.db.add(db_group)
                created.append({
                    "oid": ext["oid"],
                    "name": ext["name"],
                    "description": description,
                    "description_source": "preserved" if description and ext["oid"] in old_by_oid and old_by_oid[ext["oid"]].description else "external"
                })
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

    # backend/services/db_group_service.py

    async def get_group_members_from_external_db(self, group_id: int) -> Dict[str, Any]:
        """Получает список пользователей, входящих в группу (роль) во внешней БД"""
        result = await self.db.execute(select(DB_Group).where(DB_Group.id == group_id))
        group = result.scalar_one_or_none()
        if not group:
            raise ValueError(f"Группа с ID {group_id} не найдена")

        conn_result = await self.db.execute(select(DB_Connection).where(DB_Connection.id == group.connection_id))
        connection = conn_result.scalar_one_or_none()
        if not connection:
            raise ValueError("Подключение не найдено")

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

            # Получаем членов группы
            members_query = """
            SELECT
                ur.oid AS user_oid,
                ur.rolname AS username,
                ur.rolsuper
            FROM pg_auth_members am
            JOIN pg_roles gr ON gr.oid = am.roleid
            JOIN pg_roles ur ON ur.oid = am.member
            WHERE gr.rolname = $1 AND ur.rolcanlogin = true
            ORDER BY ur.rolname;
            """
            rows = await conn.fetch(members_query, group.name)
            await conn.close()

            members = [
                {
                    "user_oid": row["user_oid"],
                    "username": row["username"],
                    "rolsuper": row["rolsuper"]
                }
                for row in rows
            ]

            return {
                "group_id": group.id,
                "group_name": group.name,
                "connection_id": group.connection_id,
                "connection_name": connection.name,
                "total_members": len(members),
                "members": members
            }

        except Exception as e:
            if 'conn' in locals():
                await conn.close()
            raise Exception(f"Ошибка при получении членов группы из внешней БД: {str(e)}")