# backend/main.py

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from backend.api.v1 import api_v1_router
from backend.core.limiter import limiter
from backend.database.session import Base, engine

"""Настройка логирования"""
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(backend: FastAPI):
    """При запуске приложения: создаем таблицы"""
    try:
        async with engine.begin() as conn:
            logger.info("🔄 Создание таблиц базы данных...")
            await conn.run_sync(Base.metadata.create_all)
            logger.info("✅ Таблицы базы данных успешно созданы")
    except Exception as e:
        logger.error(f"❌ Ошибка при создании таблиц: {e}")
        raise
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
