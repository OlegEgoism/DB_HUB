# backend/database/session.py

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base

APP_DATABASE_URL = "sqlite+aiosqlite:///./db_hub.sqlite3"
APP_DATABASE_FALLBACK_URL = "postgresql+asyncpg://user:pass@localhost:5432/name"


def _build_legacy_postgres_url() -> str:
    return APP_DATABASE_FALLBACK_URL


DATABASE_URL = APP_DATABASE_URL

if DATABASE_URL.startswith("sqlite+aiosqlite"):
    try:
        import aiosqlite  # noqa: F401
    except ModuleNotFoundError:
        fallback_url = _build_legacy_postgres_url()
        print("⚠️ Модуль aiosqlite не найден. Используем fallback БД приложения.")
        DATABASE_URL = fallback_url

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
