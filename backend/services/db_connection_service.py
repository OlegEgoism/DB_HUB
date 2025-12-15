# backend/services/db_connection_service.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.models.db import Connection
from backend.models.user import User
from backend.core.security import encrypt_password
from backend.schemas.db_connection_schemas import ConnectionCreate, ConnectionUpdate


async def get_connection(db: AsyncSession, connection_id: int) -> Connection | None:
    result = await db.execute(select(Connection).where(Connection.id == connection_id))
    return result.scalar_one_or_none()


async def get_connections(db: AsyncSession):
    result = await db.execute(select(Connection))
    return result.scalars().all()


async def create_connection(db: AsyncSession, connection: ConnectionCreate) -> Connection:
    result = await db.execute(select(User).where(User.id == connection.owner_id))
    owner = result.scalar_one_or_none()
    if not owner:
        raise ValueError(f"Владелец с ID {connection.owner_id} не найден")
    encrypted_password = encrypt_password(connection.password)
    db_connection = Connection(
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
    db.add(db_connection)
    await db.commit()
    await db.refresh(db_connection)
    return db_connection


async def update_connection(db: AsyncSession, connection_id: int, connection_update: ConnectionUpdate) -> Connection | None:
    db_connection = await get_connection(db, connection_id)
    if not db_connection:
        return None
    update_data = connection_update.model_dump(exclude_unset=True)
    if "owner_id" in update_data and update_data["owner_id"] is not None:
        result = await db.execute(select(User).where(User.id == update_data["owner_id"]))
        owner = result.scalar_one_or_none()
        if not owner:
            raise ValueError(f"Владелец с ID {update_data['owner_id']} не найден")
    if "password" in update_data and update_data["password"] is not None:
        update_data["password"] = encrypt_password(update_data["password"])
    for field, value in update_data.items():
        if value is not None:
            setattr(db_connection, field, value)
    await db.commit()
    await db.refresh(db_connection)
    return db_connection


async def delete_connection(db: AsyncSession, connection_id: int) -> bool:
    db_connection = await get_connection(db, connection_id)
    if not db_connection:
        return False
    await db.delete(db_connection)
    await db.commit()
    return True
