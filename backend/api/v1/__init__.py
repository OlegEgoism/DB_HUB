# backend/api/v1/__init__.py

from fastapi import APIRouter

from backend.api.v1 import (
    app_agreements,
    app_auth,
    app_users,
    db_connections,
    db_functions,
    db_groups,
    db_indexes,
    db_metrics,
    db_procedures,
    db_query,
    db_schemas,
    db_tables,
    db_users,
    db_views,
)

api_v1_router = APIRouter(prefix="/api/v1")

# Подключаем все роутеры
api_v1_router.include_router(app_agreements.router)
api_v1_router.include_router(app_auth.router)
api_v1_router.include_router(app_users.router)
api_v1_router.include_router(db_connections.router)
api_v1_router.include_router(db_metrics.router)
api_v1_router.include_router(db_groups.router)
api_v1_router.include_router(db_users.router)
api_v1_router.include_router(db_schemas.router)
api_v1_router.include_router(db_tables.router)
api_v1_router.include_router(db_views.router)
api_v1_router.include_router(db_indexes.router)
api_v1_router.include_router(db_functions.router)
api_v1_router.include_router(db_procedures.router)
api_v1_router.include_router(db_query.router)
