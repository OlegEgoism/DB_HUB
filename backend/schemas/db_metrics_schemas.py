# backend/schemas/db_metrics_schemas.py
from pydantic import BaseModel, ConfigDict
from typing import List, Optional

class DatabaseMetric(BaseModel):
    metric: str
    value: str

class SegmentDetail(BaseModel):
    content: int
    role: str
    status: str
    port: int
    address: str

class ExtensionInfo(BaseModel):
    name: str
    version: str

class AllDatabaseMetricsResponse(BaseModel):
    """Общая схема для всех метрик базы данных"""
    connection_id: int
    connection_name: str
    connection_description: Optional[str] = None
    database_name: str
    host: str
    port: int
    username: str
    environment: Optional[str] = None
    database_type: Optional[str] = None
    status: str
    basic_metrics: List[DatabaseMetric]
    extensions: List[ExtensionInfo]
    cluster_replication: List[DatabaseMetric]
    segment_details: List[SegmentDetail]
    model_config = ConfigDict(from_attributes=True)

class ShowAllItem(BaseModel):
    name: str
    setting: str

class ShowAllResponse(BaseModel):
    settings: List[ShowAllItem]