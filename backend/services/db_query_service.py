# backend/services/db_query_service.py
import re
import asyncpg
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models.db import DB_Connection
from backend.utils.external_db import external_db_connection, get_db_connection_by_id


class DBQueryService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_connection(self, connection_id: int) -> DB_Connection:
        connection = await get_db_connection_by_id(self.db, connection_id)
        if not connection:
            raise ValueError(f"Подключение с id {connection_id} не найдено")
        return connection

    @staticmethod
    def is_safe_select_query(query: str) -> bool:
        """Проверяет, что запрос — только SELECT без опасных конструкций"""
        normalized = re.sub(r"--.*", "", query)
        normalized = re.sub(r"/\*.*?\*/", "", normalized, flags=re.DOTALL)
        normalized = normalized.strip().lower()

        if not normalized.startswith("select"):
            return False

        dangerous_keywords = [
            "insert",
            "update",
            "delete",
            "drop",
            "create",
            "alter",
            "truncate",
            "grant",
            "revoke",
            "execute",
            "copy",
            "vacuum",
            "analyze",
            "do",
            "call",
        ]
        for kw in dangerous_keywords:
            if re.search(rf"\b{kw}\b", normalized):
                return False

        return True

    async def execute_query(self, connection_id: int, query: str, limit: int = 100) -> Dict[str, Any]:
        if not self.is_safe_select_query(query):
            raise ValueError("Разрешены только безопасные SELECT-запросы")

        connection = await self._get_connection(connection_id)

        async with external_db_connection(connection, timeout=30) as conn:
            try:
                limited_query = f"({query.strip().rstrip(';')}) LIMIT {limit + 1}"
                stmt = await conn.prepare(limited_query)
                columns = [col.name for col in stmt.get_attributes()]
                records = await stmt.fetch()

                truncated = len(records) > limit
                records = records[:limit]

                rows = []
                for record in records:
                    row_dict = {}
                    for col in columns:
                        value = record[col]
                        row_dict[col] = value
                    rows.append(row_dict)

                return {
                    "connection_id": connection_id,
                    "query": query,
                    "columns": columns,
                    "rows": rows,
                    "total_rows": len(rows),
                    "truncated": truncated,
                }

            except asyncpg.exceptions.PostgresSyntaxError as e:
                raise ValueError(f"Ошибка синтаксиса SQL: {e}")
            except asyncpg.exceptions.InsufficientPrivilegeError as e:
                raise ValueError(f"Недостаточно прав для выполнения запроса: {e}")
            except Exception as e:
                raise ValueError(f"Ошибка выполнения запроса: {e}")
