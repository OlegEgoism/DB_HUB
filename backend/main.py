# backend/main.py

import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from sqlalchemy import select

from backend.api.v1 import api_v1_router
from backend.core.limiter import limiter
from backend.database.session import AsyncSessionLocal, Base, engine
from backend.models.user import User

"""Настройка логирования"""
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def ensure_admin_user() -> None:
    """Создать дефолтного superuser admin, если он отсутствует."""
    admin_created_at = datetime(2026, 3, 13, 23, 43, 52, 972000, tzinfo=timezone(timedelta(hours=3)))
    admin_updated_at = datetime(2026, 3, 13, 23, 44, 9, 549000, tzinfo=timezone(timedelta(hours=3)))

    async with AsyncSessionLocal() as session:
        existing_admin = await session.scalar(select(User).where(User.username == "admin"))
        if existing_admin is not None:
            logger.info("ℹ️ Пользователь admin уже существует, создание не требуется")
            return

        admin_user = User(
            username="admin",
            email="admin@admin.com",
            hashed_password="$2b$12$4X9Y9CEdbYwO7PkItheV7eqfYlVj435cPIWSZOjDP2.MCFwPNBcyK",
            fio="admin",
            is_active=True,
            is_superuser=True,
            role="Администратор БД",
            last_login=None,
            refresh_token=None,
            created_at=admin_created_at,
            updated_at=admin_updated_at,
        )

        session.add(admin_user)
        await session.commit()
        logger.info("✅ Дефолтный пользователь admin создан")

@asynccontextmanager
async def lifespan(backend: FastAPI):
    """При запуске приложения: создаем таблицы"""
    max_attempts = 20
    retry_delay_seconds = 2

    for attempt in range(1, max_attempts + 1):
        try:
            async with engine.begin() as conn:
                logger.info("🔄 Создание таблиц базы данных...")
                await conn.run_sync(Base.metadata.create_all)
                logger.info("✅ Таблицы базы данных успешно созданы")
            break
        except Exception as e:
            if attempt == max_attempts:
                logger.error(f"❌ Ошибка при создании таблиц после {max_attempts} попыток: {e}")
                raise

            logger.warning(
                "⚠️ База данных недоступна (попытка %s/%s): %s. Повтор через %s сек...",
                attempt,
                max_attempts,
                e,
                retry_delay_seconds,
            )
            await asyncio.sleep(retry_delay_seconds)

    await ensure_admin_user()

    yield
    await engine.dispose()


app = FastAPI(title="DB HUB API", lifespan=lifespan, version="1.0.0")

# Подключаем limiter к приложению
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

"""Подключаем роутеры"""
app.include_router(api_v1_router)
