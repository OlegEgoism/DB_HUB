# backend/services/db_schema_service.py
import asyncpg
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.models.db import DB_Connection
from backend.core.security import decrypt_password
import math
import re


class DBSchemaService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_connection(self, connection_id: int) -> DB_Connection:
        """Получить подключение по ID"""
        result = await self.db.execute(select(DB_Connection).where(DB_Connection.id == connection_id))
        connection = result.scalar_one_or_none()
        if not connection:
            raise ValueError(f"Подключение с ID {connection_id} не найдено")
        return connection

    async def _execute_query(self, connection: DB_Connection, query: str, *params) -> List[asyncpg.Record]:
        """Выполнить запрос к внешней БД"""
        password = decrypt_password(connection.password)
        conn = await asyncpg.connect(
            host=connection.host,
            port=connection.port,
            user=connection.username,
            password=password,
            database=connection.database_name,
            timeout=10,
        )
        try:
            rows = await conn.fetch(query, *params)
            return rows
        finally:
            await conn.close()

    async def get_schema_by_oid(self, connection_id: int, schema_oid: int) -> Dict[str, Any]:
        """Получить информацию о схеме по OID"""
        connection = await self.get_connection(connection_id)
        query = """
            SELECT 
                n.oid,
                n.nspname as name,
                pg_catalog.pg_get_userbyid(n.nspowner) as owner,
                pg_catalog.obj_description(n.oid, 'pg_namespace') as description
            FROM pg_catalog.pg_namespace n
            WHERE n.oid = $1
              AND n.nspname NOT LIKE 'pg\_%'
              AND n.nspname != 'information_schema'
        """
        rows = await self._execute_query(connection, query, schema_oid)
        if not rows:
            raise ValueError(f"Схема с OID {schema_oid} не найдена")
        schema = dict(rows[0])
        schema_stats = await self._get_schema_detailed_stats(connection, schema_oid)
        return {"oid": schema["oid"], "name": schema["name"], "owner": schema["owner"], "description": schema["description"], **schema_stats}

    async def get_schemas_with_statistics(self, connection_id: int, search: Optional[str] = None, page: int = 1, size: int = 20, sort_by: str = "name", sort_order: str = "asc") -> Dict[str, Any]:
        """Получить список схем с подробной статистикой"""
        connection = await self.get_connection(connection_id)
        base_query = """
            SELECT 
                n.oid,
                n.nspname as name,
                pg_catalog.pg_get_userbyid(n.nspowner) as owner,
                pg_catalog.obj_description(n.oid, 'pg_namespace') as description
            FROM pg_catalog.pg_namespace n
            WHERE n.nspname NOT LIKE 'pg\_%'
              AND n.nspname != 'information_schema'
        """
        where_conditions = []
        params = []
        if search and search.strip():
            search_term = f"%{search.strip().lower()}%"
            where_conditions.append("""
                (LOWER(n.nspname) LIKE $1 OR 
                 LOWER(pg_catalog.pg_get_userbyid(n.nspowner)) LIKE $1 OR 
                 LOWER(pg_catalog.obj_description(n.oid, 'pg_namespace')) LIKE $1)
            """)
            params.append(search_term)
        if where_conditions:
            base_query += " AND " + " AND ".join(where_conditions)
        count_query = f"""
            SELECT COUNT(*) as total
            FROM ({base_query}) as filtered_schemas
        """
        count_result = await self._execute_query(connection, count_query, *params)
        total_filtered = count_result[0]["total"] if count_result else 0
        total_query = """
            SELECT COUNT(*) as total
            FROM pg_catalog.pg_namespace n
            WHERE n.nspname NOT LIKE 'pg\_%'
              AND n.nspname != 'information_schema'
        """
        total_result = await self._execute_query(connection, total_query)
        total_all = total_result[0]["total"] if total_result else 0
        valid_sort_fields = {
            "name": "name",
            "owner": "owner",
            "oid": "oid",
            "size_bytes": "size_bytes",
            "table_count": "table_count"
        }
        sort_field = valid_sort_fields.get(sort_by, "name")
        sort_dir = "DESC" if sort_order.lower() == "desc" else "ASC"
        offset = (page - 1) * size
        limit = size
        paginated_query = f"""
            {base_query}
            ORDER BY {sort_field} {sort_dir}
            LIMIT ${len(params) + 1} OFFSET ${len(params) + 2}
        """
        params_with_pagination = params + [limit, offset]
        schemas = await self._execute_query(connection, paginated_query, *params_with_pagination)
        schemas_with_stats = []
        for schema in schemas:
            schema_stats = await self._get_schema_detailed_stats(connection, schema["oid"])
            schemas_with_stats.append({
                "oid": schema["oid"],
                "name": schema["name"],
                "owner": schema["owner"],
                "description": schema["description"],
                **schema_stats
            })
        pages = math.ceil(total_filtered / size) if size > 0 and total_filtered > 0 else 1
        has_next = page < pages
        has_prev = page > 1
        return {
            "connection_id": connection_id,
            "connection_name": connection.name,
            "total_schemas": total_all,
            "total_filtered_schemas": total_filtered,
            "page": page,
            "size": size,
            "pages": pages,
            "has_next": has_next,
            "has_prev": has_prev,
            "schemas": schemas_with_stats
        }

    async def _get_schema_detailed_stats(self, connection: DB_Connection, schema_oid: int) -> Dict[str, Any]:
        """Получить детальную статистику для конкретной схемы"""
        size_query = """
            SELECT 
                COALESCE(SUM(pg_total_relation_size(c.oid)), 0) as size_bytes,
                pg_size_pretty(COALESCE(SUM(pg_total_relation_size(c.oid)), 0)) as size_pretty
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.oid = $1
              AND c.relkind IN ('r', 't', 'm', 'i')
        """
        size_result = await self._execute_query(connection, size_query, schema_oid)
        size_bytes = size_result[0]["size_bytes"] if size_result else 0
        size_pretty = size_result[0]["size_pretty"] if size_result else "0 bytes"
        tables_query = """
            SELECT COUNT(*) as count
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.oid = $1
              AND c.relkind = 'r'
              AND c.relpersistence = 'p'
        """
        tables_result = await self._execute_query(connection, tables_query, schema_oid)
        table_count = tables_result[0]["count"] if tables_result else 0
        temp_tables_query = """
            SELECT COUNT(*) as count
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.oid = $1
              AND c.relkind = 'r'
              AND c.relpersistence = 't'
        """
        temp_tables_result = await self._execute_query(connection, temp_tables_query, schema_oid)
        temp_table_count = temp_tables_result[0]["count"] if temp_tables_result else 0
        indexes_query = """
            SELECT COUNT(*) as count
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.oid = $1
              AND c.relkind = 'i'
        """
        indexes_result = await self._execute_query(connection, indexes_query, schema_oid)
        index_count = indexes_result[0]["count"] if indexes_result else 0
        views_query = """
            SELECT COUNT(*) as count
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.oid = $1
              AND c.relkind = 'v'
        """
        views_result = await self._execute_query(connection, views_query, schema_oid)
        view_count = views_result[0]["count"] if views_result else 0
        matviews_query = """
            SELECT COUNT(*) as count
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.oid = $1
              AND c.relkind = 'm'
        """
        matviews_result = await self._execute_query(connection, matviews_query, schema_oid)
        materialized_view_count = matviews_result[0]["count"] if matviews_result else 0
        procedures_query = """
            SELECT COUNT(*) as count
            FROM pg_proc p
            JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.oid = $1
              AND p.prokind = 'p'
        """
        procedures_result = await self._execute_query(connection, procedures_query, schema_oid)
        procedure_count = procedures_result[0]["count"] if procedures_result else 0
        functions_query = """
            SELECT COUNT(*) as count
            FROM pg_proc p
            JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.oid = $1
              AND p.prokind = 'f'
        """
        functions_result = await self._execute_query(connection, functions_query, schema_oid)
        function_count = functions_result[0]["count"] if functions_result else 0
        total_objects = (
                table_count + temp_table_count + index_count +
                view_count + materialized_view_count +
                procedure_count + function_count
        )
        return {
            "size_bytes": size_bytes,
            "size_pretty": size_pretty,
            "table_count": table_count,
            "temp_table_count": temp_table_count,
            "index_count": index_count,
            "view_count": view_count,
            "materialized_view_count": materialized_view_count,
            "procedure_count": procedure_count,
            "function_count": function_count,
            "total_objects": total_objects
        }

    async def update_schema(self, connection_id: int, schema_oid: int, name: Optional[str] = None, description: Optional[str] = None) -> Dict[str, Any]:
        """Обновить схему (переименовать и/или изменить описание)"""
        connection = await self.get_connection(connection_id)
        current_schema = await self.get_schema_by_oid(connection_id, schema_oid)
        current_name = current_schema["name"]
        changes = {}
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
            target_schema_name = current_name
            if name is not None and name != current_name:
                name = name.strip()
                if not name:
                    raise ValueError("Имя схемы не может быть пустым")
                if not re.match(r"^[a-zA-Z_][a-zA-Z0-9_]*$", name):
                    raise ValueError("Имя схемы может содержать только латинские буквы, цифры и символ подчёркивания, и должно начинаться с буквы или подчёркивания")
                forbidden_schemas = ["pg_", "information_schema"]
                if any(name.startswith(prefix) for prefix in forbidden_schemas):
                    raise ValueError("Имя схемы не может начинаться с 'pg_' или быть 'information_schema'")
                existing_query = """
                    SELECT 1 FROM pg_namespace WHERE nspname = $1 AND oid != $2
                """
                existing = await conn.fetchval(existing_query, name, schema_oid)
                if existing:
                    raise ValueError(f"Схема с именем '{name}' уже существует")
                rename_query = f'ALTER SCHEMA "{current_name}" RENAME TO "{name}"'
                await conn.execute(rename_query)
                changes["name"] = {"old": current_name, "new": name}
                target_schema_name = name
            if description is not None:
                safe_schema_name = target_schema_name.replace('"', '""')
                if description == "":
                    comment_query = f'COMMENT ON SCHEMA "{safe_schema_name}" IS NULL'
                    await conn.execute(comment_query)
                else:
                    safe_description = description.replace("'", "''")
                    comment_query = f"COMMENT ON SCHEMA \"{safe_schema_name}\" IS '{safe_description}'"
                    await conn.execute(comment_query)
                changes["description"] = {"old": current_schema["description"], "new": description}
            await conn.close()
            if name is not None and name != current_name:
                find_query = """
                    SELECT oid FROM pg_namespace WHERE nspname = $1
                """
                conn = await asyncpg.connect(
                    host=connection.host,
                    port=connection.port,
                    user=connection.username,
                    password=password,
                    database=connection.database_name,
                    timeout=10,
                )
                new_oid_result = await conn.fetchrow(find_query, name)
                await conn.close()
                if new_oid_result:
                    updated_schema = await self.get_schema_by_oid(connection_id, new_oid_result["oid"])
                else:
                    updated_schema = await self.get_schema_by_oid(connection_id, schema_oid)
            else:
                updated_schema = await self.get_schema_by_oid(connection_id, schema_oid)
            return {"message": "Схема успешно обновлена", "changes": changes, "schema": updated_schema}
        except asyncpg.exceptions.UniqueViolationError as e:
            raise ValueError(f"Ошибка уникальности при переименовании схемы: {str(e)}")
        except asyncpg.exceptions.InvalidSchemaNameError as e:
            raise ValueError(f"Некорректное имя схемы: {str(e)}")
        except Exception as e:
            if 'conn' in locals():
                await conn.close()
            raise Exception(f"Ошибка при обновлении схемы: {str(e)}")

    async def create_schema(self, connection_id: int, name: str, owner: Optional[str] = None, description: Optional[str] = None) -> Dict[str, Any]:
        """Создать новую схему во внешней БД"""
        connection = await self.get_connection(connection_id)
        name = name.strip()
        if not name:
            raise ValueError("Имя схемы не может быть пустым")
        if not re.match(r"^[a-zA-Z_][a-zA-Z0-9_]*$", name):
            raise ValueError(
                "Имя схемы должно начинаться с буквы или подчёркивания и "
                "содержать только латинские буквы, цифры и подчёркивания"
            )
        forbidden_schemas = ["pg_", "information_schema"]
        if any(name.startswith(prefix) for prefix in forbidden_schemas) or name == "information_schema":
            raise ValueError("Имя схемы не может начинаться с 'pg_' или быть 'information_schema'")
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
            existing_query = """
                SELECT 1 FROM pg_namespace WHERE nspname = $1
            """
            existing = await conn.fetchval(existing_query, name)
            if existing:
                await conn.close()
                raise ValueError(f"Схема с именем '{name}' уже существует")
            create_query = f'CREATE SCHEMA "{name}"'
            if owner:
                create_query += f' AUTHORIZATION "{owner}"'
            await conn.execute(create_query)
            if description:
                safe_schema_name = name.replace('"', '""')
                safe_description = description.replace("'", "''")
                comment_query = f"COMMENT ON SCHEMA \"{safe_schema_name}\" IS '{safe_description}'"
                await conn.execute(comment_query)
            info_query = """
                SELECT 
                    n.oid,
                    n.nspname as name,
                    pg_catalog.pg_get_userbyid(n.nspowner) as owner
                FROM pg_catalog.pg_namespace n
                WHERE n.nspname = $1
            """
            schema_info = await conn.fetchrow(info_query, name)
            await conn.close()
            stats = await self._get_schema_detailed_stats(connection, schema_info["oid"])
            return {
                "message": f"Схема '{name}' успешно создана",
                "schema": {"oid": schema_info["oid"], "name": schema_info["name"], "owner": schema_info["owner"], "description": description, **stats}}
        except asyncpg.exceptions.UniqueViolationError as e:
            raise ValueError(f"Схема с именем '{name}' уже существует")
        except asyncpg.exceptions.InvalidSchemaNameError as e:
            raise ValueError(f"Некорректное имя схемы: {str(e)}")
        except asyncpg.exceptions.UndefinedObjectError as e:
            if "owner" in str(e):
                raise ValueError(f"Пользователь '{owner}' не найден")
            raise
        except Exception as e:
            if 'conn' in locals():
                await conn.close()
            raise Exception(f"Ошибка при создании схемы: {str(e)}")

    async def delete_schema(self, connection_id: int, schema_name: str, cascade: bool = False) -> Dict[str, Any]:
        """Удалить схему из внешней БД"""
        connection = await self.get_connection(connection_id)
        schema_name = schema_name.strip()
        if not schema_name:
            raise ValueError("Имя схемы не может быть пустым")
        if schema_name.startswith("pg_") or schema_name == "information_schema":
            raise ValueError("Нельзя удалять системные схемы (pg_*, information_schema)")
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
            exists_query = """
                SELECT 1 FROM pg_namespace WHERE nspname = $1
            """
            exists = await conn.fetchval(exists_query, schema_name)
            if not exists:
                await conn.close()
                raise ValueError(f"Схема '{schema_name}' не найдена")
            info_query = """
                SELECT 
                    n.oid,
                    n.nspname as name,
                    pg_catalog.pg_get_userbyid(n.nspowner) as owner,
                    pg_catalog.obj_description(n.oid, 'pg_namespace') as description
                FROM pg_catalog.pg_namespace n
                WHERE n.nspname = $1
            """
            schema_info = await conn.fetchrow(info_query, schema_name)
            stats = await self._get_schema_detailed_stats(connection, schema_info["oid"])
            drop_query = f'DROP SCHEMA "{schema_name}"'
            if cascade:
                drop_query += ' CASCADE'
            await conn.execute(drop_query)
            await conn.close()
            return {
                "message": f"Схема '{schema_name}' успешно удалена" + (" (вместе со всеми объектами)" if cascade else ""),
                "deleted_schema": {
                    "name": schema_info["name"],
                    "owner": schema_info["owner"],
                    "description": schema_info["description"],
                    **stats
                }
            }
        except asyncpg.exceptions.DependentObjectsStillExistError as e:
            raise ValueError(f"Нельзя удалить схему '{schema_name}', так как она содержит объекты. Используйте параметр cascade=true для удаления вместе со всеми объектами.")
        except Exception as e:
            if 'conn' in locals():
                await conn.close()
            raise Exception(f"Ошибка при удалении схемы: {str(e)}")
