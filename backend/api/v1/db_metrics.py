# backend/api/v1/db_metrics.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.session import get_db
from backend.models.db import DB_Connection
from backend.schemas.db_metrics_schemas import (
    AllDatabaseMetricsResponse,
    ShowAllResponse,
)
from backend.services.db_metrics_services import DBMetricsService

router = APIRouter(prefix="/db_connections/{connection_id}", tags=["DB METRIC"])


@router.get("/metrics", response_model=AllDatabaseMetricsResponse)
async def get_database_metrics(connection_id: int, db: AsyncSession = Depends(get_db)):
    """Получить все метрики базы данных"""
    result = await db.execute(select(DB_Connection).where(DB_Connection.id == connection_id))
    connection = result.scalar_one_or_none()
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Подключение с ID {connection_id} не найдено",
        )
    try:
        all_metrics = await DBMetricsService.get_database_metrics(connection)
        return AllDatabaseMetricsResponse(
            connection_id=connection.id,
            connection_name=connection.name,
            connection_description=connection.description,
            database_name=connection.database_name,
            host=connection.host,
            port=connection.port,
            username=connection.username,
            environment=connection.environment,
            database_type=connection.database_type,
            status=all_metrics["status"],
            basic_metrics=all_metrics["basic_metrics"],
            extensions=all_metrics["extensions"],
            cluster_replication=all_metrics["cluster_replication"],
            segment_details=all_metrics["segment_details"],
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при получении метрик: {str(e)}",
        ) from e


@router.get("/settings", response_model=ShowAllResponse)
async def get_database_settings(connection_id: int, db: AsyncSession = Depends(get_db)):
    """Получить все настройки базы данных"""
    result = await db.execute(select(DB_Connection).where(DB_Connection.id == connection_id))
    connection = result.scalar_one_or_none()
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Подключение с ID {connection_id} не найдено",
        )
    try:
        settings = await DBMetricsService.get_database_settings(connection)
        return ShowAllResponse(settings=settings)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при получении SHOW ALL: {str(e)}",
        ) from e
