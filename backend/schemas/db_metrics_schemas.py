# backend/schemas/db_metrics_schemas.py

from pydantic import BaseModel, ConfigDict


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
    connection_description: str | None = None
    database_name: str
    host: str
    port: int
    username: str
    environment: str | None = None
    database_type: str | None = None
    status: str
    basic_metrics: list[DatabaseMetric]
    extensions: list[ExtensionInfo]
    cluster_replication: list[DatabaseMetric]
    segment_details: list[SegmentDetail]
    model_config = ConfigDict(from_attributes=True)


class ShowAllItem(BaseModel):
    name: str
    setting: str


class ShowAllResponse(BaseModel):
    settings: list[ShowAllItem]
