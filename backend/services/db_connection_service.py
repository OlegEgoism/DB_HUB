# backend/services/db_connection_service.py
from typing import Optional
import asyncpg
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.models.db import DB_Connection
from backend.models.user import User
from backend.core.security import encrypt_password, decrypt_password
from backend.schemas.db_connection_schemas import (
    ConnectionCreate,
    ConnectionUpdate,
    ConnectionOut,
    PaginatedActiveConnectionsResponse
)
import math


class DBConnectionService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_connection(self, connection_id: int) -> DB_Connection | None:
        """Получить подключение по ID"""
        result = await self.db.execute(select(DB_Connection).where(DB_Connection.id == connection_id))
        return result.scalar_one_or_none()

    async def get_all_connections(self):
        """Получить все подключения"""
        result = await self.db.execute(select(DB_Connection))
        return result.scalars().all()

    async def _get_db_status_and_size(self, connection: DB_Connection) -> tuple[str, float | None]:
        """Получить статус подключения и размер БД"""
        try:
            password = decrypt_password(connection.password)
            import asyncpg
            conn = await asyncpg.connect(
                host=connection.host,
                port=connection.port,
                user=connection.username,
                password=password,
                database=connection.database_name,
                timeout=5
            )
            size_bytes = await conn.fetchval("SELECT pg_database_size(current_database())")
            await conn.close()
            return "connected", round(size_bytes / 1024 / 1024, 2)
        except Exception:
            return "error", None

    async def create_connection(self, connection: ConnectionCreate) -> DB_Connection:
        """Создать новое подключение"""
        result = await self.db.execute(select(User).where(User.id == connection.owner_id))
        owner = result.scalar_one_or_none()
        if not owner:
            raise ValueError(f"Владелец с ID {connection.owner_id} не найден")
        encrypted_password = encrypt_password(connection.password)
        db_connection = DB_Connection(
            name=connection.name,
            description=connection.description,
            database_type=connection.database_type,
            environment=connection.environment,
            is_favorite=connection.is_favorite,
            host=connection.host,
            port=connection.port,
            database_name=connection.database_name,
            username=connection.username,
            password=encrypted_password,
            owner_id=connection.owner_id
        )
        self.db.add(db_connection)
        await self.db.commit()
        await self.db.refresh(db_connection)
        return db_connection

    async def update_connection(self, connection_id: int, connection_update: ConnectionUpdate) -> DB_Connection | None:
        """Обновить существующее подключение"""
        db_connection = await self.get_connection(connection_id)
        if not db_connection:
            return None
        update_data = connection_update.model_dump(exclude_unset=True)
        if "owner_id" in update_data and update_data["owner_id"] is not None:
            result = await self.db.execute(select(User).where(User.id == update_data["owner_id"]))
            owner = result.scalar_one_or_none()
            if not owner:
                raise ValueError(f"Владелец с ID {update_data['owner_id']} не найден")
        if "password" in update_data and update_data["password"] is not None:
            update_data["password"] = encrypt_password(update_data["password"])
        for field, value in update_data.items():
            if value is not None:
                setattr(db_connection, field, value)
        await self.db.commit()
        await self.db.refresh(db_connection)
        return db_connection

    async def delete_connection(self, connection_id: int) -> bool:
        """Удалить подключение"""
        db_connection = await self.get_connection(connection_id)
        if not db_connection:
            return False
        await self.db.delete(db_connection)
        await self.db.commit()
        return True

    async def get_connection_with_status(self, connection_id: int) -> ConnectionOut:
        """Получить подключение с дополнительным статусом и размером БД"""
        connection = await self.get_connection(connection_id)
        if not connection:
            raise ValueError("Подключение не найдено")
        status, size_mb = await self._get_db_status_and_size(connection)
        return ConnectionOut(
            id=connection.id,
            name=connection.name,
            description=connection.description,
            database_type=connection.database_type,
            environment=connection.environment,
            is_favorite=connection.is_favorite,
            host=connection.host,
            port=connection.port,
            database_name=connection.database_name,
            username=connection.username,
            owner_id=connection.owner_id,
            created_at=connection.created_at,
            updated_at=connection.updated_at,
            status=status,
            db_size_mb=size_mb
        )

    async def get_active_connections(
            self,
            connection_id: int,
            page: int = 1,
            size: int = 20,
            username: Optional[str] = None
    ) -> PaginatedActiveConnectionsResponse:
        """Получает список активных сессий из внешней PostgreSQL-БД с пагинацией и фильтрацией по username"""
        connection = await self.get_connection(connection_id)
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
            where_conditions = ["state IS NOT NULL", "pid <> pg_backend_pid()"]
            params = []
            if username and username.strip():
                where_conditions.append("usename ILIKE $1")
                params.append(f"%{username.strip()}%")
            where_clause = " AND ".join(where_conditions)
            total_all_query = f"""
                SELECT COUNT(*) as total
                FROM pg_stat_activity
                WHERE state IS NOT NULL
                  AND pid <> pg_backend_pid()
            """
            total_all_result = await conn.fetchrow(total_all_query)
            total_all = total_all_result["total"] if total_all_result else 0
            total_filtered_query = f"""
                SELECT COUNT(*) as total
                FROM pg_stat_activity
                WHERE {where_clause}
            """
            total_filtered_result = await conn.fetchrow(total_filtered_query, *params)
            total_filtered = total_filtered_result["total"] if total_filtered_result else 0
            offset = (page - 1) * size
            limit = size
            query = f"""
                SELECT
                    pid,
                    usename AS username,
                    application_name,
                    client_addr::text AS client_addr,
                    client_hostname,
                    client_port,
                    backend_start,
                    query_start,
                    state_change,
                    state,
                    query
                FROM pg_stat_activity
                WHERE {where_clause}
                ORDER BY backend_start DESC
                LIMIT ${len(params) + 1} OFFSET ${len(params) + 2};
            """
            params_with_pagination = params + [limit, offset]
            rows = await conn.fetch(query, *params_with_pagination)
            await conn.close()
            active_connections = []
            for row in rows:
                active_connections.append({
                    "pid": row["pid"],
                    "username": row["username"],
                    "application_name": row["application_name"],
                    "client_addr": row["client_addr"],
                    "client_hostname": row["client_hostname"],
                    "client_port": row["client_port"],
                    "backend_start": row["backend_start"],
                    "query_start": row["query_start"],
                    "state_change": row["state_change"],
                    "state": row["state"],
                    "query": (row["query"] or "")
                })
            pages = math.ceil(total_filtered / size) if size > 0 and total_filtered > 0 else 1
            has_next = page < pages
            has_prev = page > 1
            return PaginatedActiveConnectionsResponse(
                connection_id=connection.id,
                connection_name=connection.name,
                total_active_connections=total_all,
                total_filtered_connections=total_filtered,
                page=page,
                size=size,
                pages=pages,
                has_next=has_next,
                has_prev=has_prev,
                active_connections=active_connections
            )
        except Exception as e:
            if 'conn' in locals():
                await conn.close()
            raise Exception(f"Ошибка при получении активных подключений: {str(e)}")

    async def terminate_backend_process(self, connection_id: int, pid: int) -> dict:
        """Завершает процесс (подключение) во внешней PostgreSQL-БД по PID"""
        connection = await self.get_connection(connection_id)
        if not connection:
            raise ValueError("Подключение не найдено")
        if pid <= 0:
            raise ValueError("Недопустимый PID")
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
            exists = await conn.fetchval("""
                SELECT 1 FROM pg_stat_activity
                WHERE pid = $1 AND pid <> pg_backend_pid()
            """, pid)
            if not exists:
                await conn.close()
                raise ValueError(f"Процесс с PID {pid} не найден или уже завершён")
            result = await conn.fetchval("SELECT pg_terminate_backend($1)", pid)
            await conn.close()
            if result:
                return {
                    "success": True,
                    "message": f"Процесс с PID {pid} успешно завершён",
                    "pid": pid,
                    "connection_id": connection_id
                }
            else:
                raise Exception(f"Не удалось завершить процесс с PID {pid}")
        except Exception as e:
            if 'conn' in locals():
                await conn.close()
            raise Exception(f"Ошибка при завершении процесса: {str(e)}")
