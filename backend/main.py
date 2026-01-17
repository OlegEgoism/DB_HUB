# backend/main.py
from fastapi import FastAPI
from contextlib import asynccontextmanager
from backend.database.session import engine, Base
import logging
from fastapi.middleware.cors import CORSMiddleware
from backend.api.v1 import (
    app_agreements,
    app_auth,
    app_users,
    db_connections,
    db_metrics,
    db_groups,
    db_users,
    db_schemas,
    db_tables,
    db_views,
    db_indexes,
    db_functions,
    db_procedures
)

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


app = FastAPI(
    title="DB HUB API",
    lifespan=lifespan,
    version="1.0.0"
)

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

"""Подключаем роутеры"""
app.include_router(app_agreements.router, prefix="/api/v1")
app.include_router(app_auth.router, prefix="/api/v1")
app.include_router(app_users.router, prefix="/api/v1")
app.include_router(db_connections.router, prefix="/api/v1")
app.include_router(db_metrics.router, prefix="/api/v1")
app.include_router(db_groups.router, prefix="/api/v1")
app.include_router(db_users.router, prefix="/api/v1")
app.include_router(db_schemas.router, prefix="/api/v1")
app.include_router(db_tables.router, prefix="/api/v1")
app.include_router(db_views.router, prefix="/api/v1")
app.include_router(db_indexes.router, prefix="/api/v1")
app.include_router(db_functions.router, prefix="/api/v1")
app.include_router(db_procedures.router, prefix="/api/v1")
