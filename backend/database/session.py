# backend/database/session.py

import os

from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base

load_dotenv()

DATABASE_URL = os.getenv("APP_DATABASE_URL", "sqlite+aiosqlite:///./db_hub.sqlite3")
print(f"🔗 Подключение к базе данных приложения: {DATABASE_URL}")

try:
    engine_kwargs: dict = {"echo": True}
    if DATABASE_URL.startswith("sqlite+"):
        engine_kwargs["connect_args"] = {"check_same_thread": False}

    engine = create_async_engine(DATABASE_URL, **engine_kwargs)
    AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    print("✅ Движок базы данных приложения успешно создан")
except Exception as e:
    print(f"❌ Ошибка при создании движка базы данных приложения: {e}")
    raise

Base = declarative_base()


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
