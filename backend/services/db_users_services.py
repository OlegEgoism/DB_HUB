# # backend/services/db_users_services.py
# import re
# from datetime import datetime
# import asyncpg
# from typing import List, Dict, Any, Optional
# from sqlalchemy.ext.asyncio import AsyncSession
# from sqlalchemy import select, delete
# from backend.models.db import DB_Connection, DB_User, DB_Group
# from backend.core.security import decrypt_password
#
#
# class DBUserService:
#     def __init__(self, db: AsyncSession):
#         self.db = db
#
#     async def _fetch_users_from_external_db(self, connection: DB_Connection) -> List[Dict[str, Any]]:
#         """Получает login-пользователей из внешней PostgreSQL БД с rolsuper флагом"""
#         try:
#             password = decrypt_password(connection.password)
#             conn = await asyncpg.connect(
#                 host=connection.host,
#                 port=connection.port,
#                 user=connection.username,
#                 password=password,
#                 database=connection.database_name,
#                 timeout=10,
#             )
#             query = """
#                 SELECT
#                     r.oid,
#                     r.rolname AS username,
#                     r.rolsuper
#                 FROM pg_catalog.pg_roles r
#                 WHERE r.rolcanlogin = true
#                 ORDER BY r.rolname;
#             """
#             rows = await conn.fetch(query)
#             await conn.close()
#             return [
#                 {
#                     "oid": row["oid"],
#                     "username": row["username"],
#                     "rolsuper": row["rolsuper"]  # ← добавлено
#                 }
#                 for row in rows
#             ]
#         except Exception as e:
#             raise Exception(f"Ошибка при получении пользователей из внешней БД: {str(e)}")
#
#     async def smart_sync_users_for_connection(self, connection_id: int) -> Dict[str, Any]:
#         """Умная синхронизация: сохраняем только oid и username; email и description сбрасываются в None при замене"""
#         connection_result = await self.db.execute(select(DB_Connection).where(DB_Connection.id == connection_id))
#         connection = connection_result.scalar_one_or_none()
#         if not connection:
#             raise ValueError(f"Подключение с ID {connection_id} не найдено")
#
#         external_users = await self._fetch_users_from_external_db(connection)
#         local_result = await self.db.execute(select(DB_User).where(DB_User.connection_id == connection_id))
#         local_users = local_result.scalars().all()
#
#         local_by_oid = {u.oid: u for u in local_users}
#         local_by_username = {u.username: u for u in local_users}
#         external_oids = {u["oid"] for u in external_users}
#
#         stats = {"added": 0, "updated": 0, "deleted": 0}
#         added, updated, deleted = [], [], []
#
#         # === Удаление локальных пользователей, отсутствующих во внешней БД по oid ===
#         for local in local_users:
#             if local.oid not in external_oids:
#                 if local.username in [u["username"] for u in external_users]:
#                     ext = next(u for u in external_users if u["username"] == local.username)
#                     if ext["oid"] != local.oid:
#                         # OID изменился → удаляем старую запись
#                         await self.db.delete(local)
#                         deleted.append({"oid": local.oid, "username": local.username, "reason": "oid_changed_same_username"})
#                         stats["deleted"] += 1
#                         continue
#                 # Пользователь реально удалён
#                 await self.db.delete(local)
#                 deleted.append({"oid": local.oid, "username": local.username, "reason": "deleted_from_external"})
#                 stats["deleted"] += 1
#
#         # Перечитываем текущие записи
#         fresh_result = await self.db.execute(select(DB_User).where(DB_User.connection_id == connection_id))
#         current_users = fresh_result.scalars().all()
#         current_by_oid = {u.oid: u for u in current_users}
#         current_by_username = {u.username: u for u in current_users}
#
#         # === Обработка внешних пользователей ===
#         for ext in external_users:
#             ext_oid = ext["oid"]
#             ext_username = ext["username"]
#
#             if ext_oid in current_by_oid:
#                 # oid совпадает → обновляем только username
#                 local = current_by_oid[ext_oid]
#                 if local.username != ext_username:
#                     local.username = ext_username
#                     self.db.add(local)
#                     updated.append({"oid": ext_oid, "old_username": local.username, "new_username": ext_username})
#                     stats["updated"] += 1
#                 # email, description НЕ обновляются
#
#             elif ext_username in current_by_username:
#                 # Username совпадает, oid другой → замена
#                 old = current_by_username[ext_username]
#                 await self.db.delete(old)
#                 deleted.append({"oid": old.oid, "username": old.username, "reason": "replaced_due_to_oid_change"})
#                 stats["deleted"] += 1
#
#                 new_user = DB_User(
#                     oid=ext_oid,
#                     username=ext_username,
#                     description=None,
#                     email=None,
#                     connection_id=connection_id
#                 )
#                 self.db.add(new_user)
#                 added.append({"oid": ext_oid, "username": ext_username, "reason": "username_preserved_new_oid_clean"})
#                 stats["added"] += 1
#
#             else:
#                 # Новый пользователь
#                 new_user = DB_User(
#                     oid=ext_oid,
#                     username=ext_username,
#                     description=None,
#                     email=None,
#                     connection_id=connection_id
#                 )
#                 self.db.add(new_user)
#                 added.append({"oid": ext_oid, "username": ext_username, "reason": "new_user_clean"})
#                 stats["added"] += 1
#
#         await self.db.commit()
#
#         return {
#             "connection_id": connection_id,
#             "connection_name": connection.name,
#             "total_external_users": len(external_users),
#             "sync_statistics": stats,
#             "added_users": added,
#             "updated_users": updated,
#             "deleted_users": deleted,
#             "has_changes": any(stats.values())
#         }
#
#
#     async def create_user_in_external_db(
#             self,
#             connection_id: int,
#             username: str,
#             password: str,
#             description: Optional[str] = None,
#             email: Optional[str] = None,
#             rolsuper: bool = False,
#             rolinherit: bool = True,
#             rolcreaterole: bool = False,
#             rolcreatedb: bool = False,
#             rolcanlogin: bool = True,
#             rolreplication: bool = False,
#             rolconnlimit: int = -1,
#             rolvaliduntil: Optional[str] = None
#     ) -> Dict[str, Any]:
#         username = username.strip()
#         if not username:
#             raise ValueError("Имя пользователя не может быть пустым")
#         if not re.match(r"^[a-zA-Z0-9_]+$", username):
#             raise ValueError("Имя пользователя может содержать только латинские буквы, цифры и символ подчёркивания '_'")
#         if username.lower().startswith("pg_"):
#             raise ValueError("Имена, начинающиеся с 'pg_', зарезервированы")
#         result = await self.db.execute(select(DB_Connection).where(DB_Connection.id == connection_id))
#         connection = result.scalar_one_or_none()
#         if not connection:
#             raise ValueError(f"Подключение с ID {connection_id} не найдено")
#         try:
#             decrypted_pass = decrypt_password(connection.password)
#             conn = await asyncpg.connect(
#                 host=connection.host,
#                 port=connection.port,
#                 user=connection.username,
#                 password=decrypted_pass,
#                 database=connection.database_name,
#                 timeout=10,
#             )
#             options = []
#             if rolsuper:
#                 options.append("SUPERUSER")
#             else:
#                 options.append("NOSUPERUSER")
#             if rolinherit:
#                 options.append("INHERIT")
#             else:
#                 options.append("NOINHERIT")
#             if rolcreaterole:
#                 options.append("CREATEROLE")
#             else:
#                 options.append("NOCREATEROLE")
#             if rolcreatedb:
#                 options.append("CREATEDB")
#             else:
#                 options.append("NOCREATEDB")
#             if rolcanlogin:
#                 options.append("LOGIN")
#             else:
#                 options.append("NOLOGIN")
#             if rolreplication:
#                 options.append("REPLICATION")
#             else:
#                 options.append("NOREPLICATION")
#             if rolconnlimit >= 0:
#                 options.append(f"CONNECTION LIMIT {rolconnlimit}")
#             if rolvaliduntil is not None:
#                 try:
#                     dt = datetime.fromisoformat(rolvaliduntil.replace("Z", "+00:00"))
#                     options.append(f"VALID UNTIL '{dt.isoformat()}'")
#                 except ValueError:
#                     raise ValueError("Неверный формат даты для rolvaliduntil. Ожидается ISO 8601, например: 2026-12-31T23:59:59")
#             options_str = " ".join(options)
#             sql = f'CREATE ROLE "{username}" WITH {options_str} PASSWORD \'{password}\''
#             await conn.execute(sql)
#             oid_row = await conn.fetchrow('SELECT oid FROM pg_roles WHERE rolname = $1', username)
#             oid = oid_row["oid"] if oid_row else None
#             await conn.close()
#             new_user = DB_User(oid=oid, username=username, description=description, email=email, connection_id=connection_id)
#             self.db.add(new_user)
#             await self.db.commit()
#             await self.db.refresh(new_user)
#             return {
#                 "id": new_user.id,
#                 "oid": new_user.oid,
#                 "username": new_user.username,
#                 "description": new_user.description,
#                 "email": new_user.email,
#                 "created_at": new_user.created_at,
#                 "updated_at": new_user.updated_at,
#                 "message": "Пользователь успешно создан во внешней и локальной БД"
#             }
#         except asyncpg.UniqueViolationError:
#             raise ValueError(f"Пользователь с именем '{username}' уже существует во внешней БД")
#         except Exception as e:
#             if 'conn' in locals():
#                 await conn.close()
#             raise Exception(f"Ошибка при создании пользователя во внешней БД: {str(e)}")
#
#     async def update_user_in_external_db(
#             self,
#             user_id: int,
#             username: Optional[str] = None,
#             password: Optional[str] = None,
#             description: Optional[str] = None,
#             email: Optional[str] = None,
#             rolsuper: Optional[bool] = None,
#             rolinherit: Optional[bool] = None,
#             rolcreaterole: Optional[bool] = None,
#             rolcreatedb: Optional[bool] = None,
#             rolcanlogin: Optional[bool] = None,
#             rolreplication: Optional[bool] = None,
#             rolconnlimit: Optional[int] = None,
#             rolvaliduntil: Optional[str] = None
#     ) -> Dict[str, Any]:
#         result = await self.db.execute(select(DB_User).where(DB_User.id == user_id))
#         local_user = result.scalar_one_or_none()
#         if not local_user:
#             raise ValueError(f"Пользователь с ID {user_id} не найден")
#         connection_id = local_user.connection_id
#         old_username = local_user.username
#         result = await self.db.execute(select(DB_Connection).where(DB_Connection.id == connection_id))
#         connection = result.scalar_one_or_none()
#         if not connection:
#             raise ValueError("Подключение не найдено")
#         external_users = await self._fetch_users_from_external_db(connection)
#         current_ext = next((u for u in external_users if u["oid"] == local_user.oid), None)
#         if not current_ext:
#             raise ValueError("Роль не найдена во внешней БД")
#         new_username = username.strip() if username else old_username
#         if username and username != old_username:
#             if not re.match(r"^[a-zA-Z0-9_]+$", new_username):
#                 raise ValueError("Имя пользователя может содержать только латинские буквы, цифры и символ подчёркивания '_'")
#             if new_username.lower().startswith("pg_"):
#                 raise ValueError("Имена, начинающиеся с 'pg_', зарезервированы")
#         options = []
#         current_rolsuper = current_ext["rolsuper"]
#         rolsuper_val = rolsuper if rolsuper is not None else current_rolsuper
#         options.append("SUPERUSER" if rolsuper_val else "NOSUPERUSER")
#         try:
#             decrypted_pass = decrypt_password(connection.password)
#             ext_conn = await asyncpg.connect(
#                 host=connection.host,
#                 port=connection.port,
#                 user=connection.username,
#                 password=decrypted_pass,
#                 database=connection.database_name,
#                 timeout=10,
#             )
#             role_attrs = await ext_conn.fetchrow("""
#                 SELECT
#                     rolinherit,
#                     rolcreaterole,
#                     rolcreatedb,
#                     rolcanlogin,
#                     rolreplication,
#                     rolconnlimit,
#                     rolvaliduntil
#                 FROM pg_roles
#                 WHERE oid = $1
#             """, local_user.oid)
#             rolinherit_val = rolinherit if rolinherit is not None else role_attrs["rolinherit"]
#             options.append("INHERIT" if rolinherit_val else "NOINHERIT")
#             rolcreaterole_val = rolcreaterole if rolcreaterole is not None else role_attrs["rolcreaterole"]
#             options.append("CREATEROLE" if rolcreaterole_val else "NOCREATEROLE")
#             rolcreatedb_val = rolcreatedb if rolcreatedb is not None else role_attrs["rolcreatedb"]
#             options.append("CREATEDB" if rolcreatedb_val else "NOCREATEDB")
#             rolcanlogin_val = rolcanlogin if rolcanlogin is not None else role_attrs["rolcanlogin"]
#             options.append("LOGIN" if rolcanlogin_val else "NOLOGIN")
#             rolreplication_val = rolreplication if rolreplication is not None else role_attrs["rolreplication"]
#             options.append("REPLICATION" if rolreplication_val else "NOREPLICATION")
#             if rolconnlimit is not None:
#                 if rolconnlimit >= 0:
#                     options.append(f"CONNECTION LIMIT {rolconnlimit}")
#             else:
#                 current_limit = role_attrs["rolconnlimit"]
#                 if current_limit >= 0:
#                     options.append(f"CONNECTION LIMIT {current_limit}")
#             valid_clause = None
#             if rolvaliduntil is not None:
#                 if rolvaliduntil.strip().lower() in ("null", "", "none"):
#                     valid_clause = "VALID UNTIL NULL"
#                 else:
#                     try:
#                         dt = datetime.fromisoformat(rolvaliduntil.replace("Z", "+00:00"))
#                         valid_clause = f"VALID UNTIL '{dt.isoformat()}'"
#                     except ValueError:
#                         raise ValueError("Неверный формат даты для rolvaliduntil. Ожидается ISO 8601, например: 2026-12-31T23:59:59")
#             else:
#                 pass
#             alter_parts = []
#             if username and username != old_username:
#                 alter_parts.append(f'ALTER ROLE "{old_username}" RENAME TO "{new_username}";')
#             options_str = " ".join(options)
#             password_clause = f" PASSWORD '{password}'" if password else ""
#             valid_part = f" {valid_clause}" if valid_clause else ""
#             alter_parts.append(f'ALTER ROLE "{new_username}" WITH {options_str}{password_clause}{valid_part};')
#             for stmt in alter_parts:
#                 await ext_conn.execute(stmt)
#             await ext_conn.close()
#         except Exception as e:
#             if 'ext_conn' in locals():
#                 await ext_conn.close()
#             raise Exception(f"Ошибка при обновлении роли во внешней БД: {str(e)}")
#         if username:
#             local_user.username = new_username
#         if description is not None:
#             local_user.description = description
#         if email is not None:
#             local_user.email = email
#         self.db.add(local_user)
#         await self.db.commit()
#         await self.db.refresh(local_user)
#         return {
#             "id": local_user.id,
#             "oid": local_user.oid,
#             "username": local_user.username,
#             "description": local_user.description,
#             "email": local_user.email,
#             "created_at": local_user.created_at,
#             "updated_at": local_user.updated_at,
#             "message": "Роль успешно обновлена"
#         }
#
#     async def delete_user_in_external_db(self, user_id: int) -> Dict[str, Any]:
#         """Удаляет роль из внешней БД и удаляет запись из локальной таблицы db_user"""
#         result = await self.db.execute(select(DB_User).where(DB_User.id == user_id))
#         local_user = result.scalar_one_or_none()
#         if not local_user:
#             raise ValueError(f"Пользователь с ID {user_id} не найден")
#         connection_id = local_user.connection_id
#         username = local_user.username
#         conn_result = await self.db.execute(select(DB_Connection).where(DB_Connection.id == connection_id))
#         connection = conn_result.scalar_one_or_none()
#         if not connection:
#             raise ValueError("Подключение не найдено")
#         try:
#             decrypted_pass = decrypt_password(connection.password)
#             ext_conn = await asyncpg.connect(
#                 host=connection.host,
#                 port=connection.port,
#                 user=connection.username,
#                 password=decrypted_pass,
#                 database=connection.database_name,
#                 timeout=10,
#             )
#             exists = await ext_conn.fetchval("SELECT 1 FROM pg_roles WHERE rolname = $1", username)
#             if not exists:
#                 await ext_conn.close()
#                 raise ValueError(f"Пользователь '{username}' не существует во внешней БД")
#             await ext_conn.execute(f'DROP ROLE "{username}";')
#             await ext_conn.close()
#             await self.db.execute(delete(DB_User).where(DB_User.id == user_id))
#             await self.db.commit()
#             return {
#                 "message": f"Пользователь '{username}' успешно удалён из внешней и локальной БД",
#                 "deleted_user_id": user_id,
#                 "username": username,
#                 "connection_id": connection_id
#             }
#         except Exception as e:
#             if 'ext_conn' in locals():
#                 await ext_conn.close()
#             await self.db.rollback()
#             raise Exception(f"Ошибка при удалении пользователя из внешней БД: {str(e)}")
#
#     async def add_user_to_group(self, user_id: int, group_id: int) -> Dict[str, Any]:
#         """Добавляет пользователя в группу во внешней БД (GRANT group TO user)"""
#         user_result = await self.db.execute(select(DB_User).where(DB_User.id == user_id))
#         user = user_result.scalar_one_or_none()
#         if not user:
#             raise ValueError(f"Пользователь с ID {user_id} не найден")
#         group_result = await self.db.execute(select(DB_Group).where(DB_Group.id == group_id))
#         group = group_result.scalar_one_or_none()
#         if not group:
#             raise ValueError(f"Группа с ID {group_id} не найдена")
#         if user.connection_id != group.connection_id:
#             raise ValueError("Пользователь и группа должны принадлежать одному подключению")
#         connection_id = user.connection_id
#         conn_result = await self.db.execute(select(DB_Connection).where(DB_Connection.id == connection_id))
#         connection = conn_result.scalar_one_or_none()
#         if not connection:
#             raise ValueError("Подключение не найдено")
#         try:
#             decrypted_pass = decrypt_password(connection.password)
#             ext_conn = await asyncpg.connect(
#                 host=connection.host,
#                 port=connection.port,
#                 user=connection.username,
#                 password=decrypted_pass,
#                 database=connection.database_name,
#                 timeout=10,
#             )
#             await ext_conn.execute(f'GRANT "{group.name}" TO "{user.username}";')
#             await ext_conn.close()
#             return {
#                 "message": f"Пользователь '{user.username}' успешно добавлен в группу '{group.name}'",
#                 "user_id": user.id,
#                 "group_id": group.id,
#                 "username": user.username,
#                 "group_name": group.name,
#                 "connection_id": connection_id
#             }
#         except Exception as e:
#             if 'ext_conn' in locals():
#                 await ext_conn.close()
#             raise Exception(f"Ошибка при добавлении пользователя в группу во внешней БД: {str(e)}")
#
#     async def remove_user_from_group(self, user_id: int, group_id: int) -> Dict[str, Any]:
#         """Удаляет пользователя из группы во внешней БД (REVOKE group FROM user)"""
#         user_result = await self.db.execute(select(DB_User).where(DB_User.id == user_id))
#         user = user_result.scalar_one_or_none()
#         if not user:
#             raise ValueError(f"Пользователь с ID {user_id} не найден")
#         group_result = await self.db.execute(select(DB_Group).where(DB_Group.id == group_id))
#         group = group_result.scalar_one_or_none()
#         if not group:
#             raise ValueError(f"Группа с ID {group_id} не найдена")
#         if user.connection_id != group.connection_id:
#             raise ValueError("Пользователь и группа должны принадлежать одному подключению")
#         connection_id = user.connection_id
#         conn_result = await self.db.execute(select(DB_Connection).where(DB_Connection.id == connection_id))
#         connection = conn_result.scalar_one_or_none()
#         if not connection:
#             raise ValueError("Подключение не найдено")
#         try:
#             decrypted_pass = decrypt_password(connection.password)
#             ext_conn = await asyncpg.connect(
#                 host=connection.host,
#                 port=connection.port,
#                 user=connection.username,
#                 password=decrypted_pass,
#                 database=connection.database_name,
#                 timeout=10,
#             )
#             user_exists = await ext_conn.fetchval("SELECT 1 FROM pg_roles WHERE rolname = $1", user.username)
#             group_exists = await ext_conn.fetchval("SELECT 1 FROM pg_roles WHERE rolname = $1", group.name)
#             if not user_exists:
#                 await ext_conn.close()
#                 raise ValueError(f"Пользователь '{user.username}' не существует во внешней БД")
#             if not group_exists:
#                 await ext_conn.close()
#                 raise ValueError(f"Группа '{group.name}' не существует во внешней БД")
#             await ext_conn.execute(f'REVOKE "{group.name}" FROM "{user.username}";')
#             await ext_conn.close()
#             return {
#                 "message": f"Пользователь '{user.username}' успешно удалён из группы '{group.name}'",
#                 "user_id": user.id,
#                 "group_id": group.id,
#                 "username": user.username,
#                 "group_name": group.name,
#                 "connection_id": connection_id
#             }
#         except Exception as e:
#             if 'ext_conn' in locals():
#                 await ext_conn.close()
#             raise Exception(f"Ошибка при удалении пользователя из группы во внешней БД: {str(e)}")
