from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Dict, Any


class DatabaseMetric(BaseModel):
    metric: str
    value: str


class ClusterNodeInfo(BaseModel):
    node_type: str
    node_role: str
    count: int


class ClusterHealthCheck(BaseModel):
    check_name: str
    status: str


class DatabaseConfigParameter(BaseModel):
    name: str
    setting: str
    unit: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None


class AllDatabaseMetricsResponse(BaseModel):
    """Общая схема для всех метрик базы данных"""
    connection_id: int
    connection_name: str
    host: str
    database_name: str
    environment: Optional[str] = None
    database_type: Optional[str] = None
    status: str
    basic_metrics: List[DatabaseMetric]
    cluster_replication: List[ClusterNodeInfo]
    cluster_health: ClusterHealthCheck
    database_config: List[DatabaseConfigParameter]
    model_config = ConfigDict(from_attributes=True)
