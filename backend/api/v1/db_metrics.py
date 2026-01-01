# backend/api/v1/db_metrics.py
from fastapi import Depends, HTTPException, APIRouter, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.database.session import get_db
from backend.models.db import DB_Connection
from backend.schemas.db_metrics_schemas import SingleDatabaseMetricsResponse, ClusterReplicationResponse, ClusterHealthResponse, DatabaseConfigResponse
from backend.services.db_metrics_service import DBMetricsService

router = APIRouter(prefix="/db_metrics", tags=["DB METRIC"])


@router.get("/{connection_id}", response_model=SingleDatabaseMetricsResponse)
async def get_database_metrics_by_id(connection_id: int, db: AsyncSession = Depends(get_db), ):
    """Получить метрики базы данных по ID подключения"""
    result = await db.execute(select(DB_Connection).where(DB_Connection.id == connection_id))
    connection = result.scalar_one_or_none()
    if not connection:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Подключение с connection_id {connection_id} не найдено", )
    metrics = await DBMetricsService.get_database_metrics(connection)
    status_text = (
        "error"
        if len(metrics) == 1 and metrics[0]["metric"] == "connection_error"
        else "connected"
    )
    return SingleDatabaseMetricsResponse(
        connection_id=connection.id,
        connection_name=connection.name,
        host=connection.host,
        database_name=connection.database_name,
        environment=connection.environment,
        database_type=connection.database_type,
        status=status_text,
        metrics=metrics,
    )


@router.get("/{connection_id}/cluster", response_model=ClusterReplicationResponse, )
async def get_cluster_replication_info(connection_id: int, db: AsyncSession = Depends(get_db), ):
    """Кластеризация и репликация (Greenplum-aware)"""
    result = await db.execute(select(DB_Connection).where(DB_Connection.id == connection_id))
    connection = result.scalar_one_or_none()
    if not connection:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Подключение с ID {connection_id} не найдено", )
    cluster_info = await DBMetricsService.get_cluster_replication_info(connection)
    status_text = "connected" if cluster_info else "not_supported"
    return ClusterReplicationResponse(
        connection_id=connection.id,
        connection_name=connection.name,
        database_name=connection.database_name,
        status=status_text,
        cluster_info=cluster_info,
    )


@router.get("/{connection_id}/cluster_health", response_model=ClusterHealthResponse, )
async def get_cluster_health(connection_id: int, db: AsyncSession = Depends(get_db), ):
    """Здоровье кластера"""
    result = await db.execute(select(DB_Connection).where(DB_Connection.id == connection_id))
    connection = result.scalar_one_or_none()
    if not connection:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Подключение с ID {connection_id} не найдено", )
    health = await DBMetricsService.get_cluster_health(connection)
    api_status = (
        "connected"
        if health["status"] != "not_supported"
        else "not_supported"
    )
    return ClusterHealthResponse(
        connection_id=connection.id,
        connection_name=connection.name,
        database_name=connection.database_name,
        status=api_status,
        health=health,
    )



@router.get("/{connection_id}/config", response_model=DatabaseConfigResponse)
async def get_database_config(connection_id: int, db: AsyncSession = Depends(get_db), ):
    """Полная конфигурацию базы данных"""
    result = await db.execute(select(DB_Connection).where(DB_Connection.id == connection_id))
    connection = result.scalar_one_or_none()
    if not connection:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Подключение не найдено")
    try:
        config_parameters = await DBMetricsService.get_database_config(connection)
        if config_parameters and len(config_parameters) == 1 and "error" in config_parameters[0]:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=config_parameters[0]["error"])
        return DatabaseConfigResponse(
            connection_id=connection.id,
            connection_name=connection.name,
            database_name=connection.database_name,
            total_parameters=len(config_parameters),
            parameters=config_parameters,
            status="success"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при получении конфигурации: {str(e)}")
