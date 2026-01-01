from pydantic import BaseModel, ConfigDict
from typing import List, Optional


class DatabaseMetric(BaseModel):
    metric: str
    value: str


class SingleDatabaseMetricsResponse(BaseModel):
    connection_id: int
    connection_name: str
    host: str
    database_name: str
    environment: Optional[str] = None
    database_type: Optional[str] = None
    status: str
    metrics: List[DatabaseMetric]
    model_config = ConfigDict(from_attributes=True)


class ClusterNodeInfo(BaseModel):
    node_type: str
    node_role: str
    count: int


class ClusterReplicationResponse(BaseModel):
    connection_id: int
    connection_name: str
    database_name: str
    status: str
    cluster_info: List[ClusterNodeInfo]
    model_config = ConfigDict(from_attributes=True)


class ClusterHealthCheck(BaseModel):
    check_name: str
    status: str


class ClusterHealthResponse(BaseModel):
    connection_id: int
    connection_name: str
    database_name: str
    status: str
    health: ClusterHealthCheck
    model_config = ConfigDict(from_attributes=True)


class DatabaseConfigParameter(BaseModel):
    name: str
    setting: str
    unit: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None


class DatabaseConfigResponse(BaseModel):
    connection_id: int
    connection_name: str
    database_name: str
    total_parameters: int
    parameters: List[DatabaseConfigParameter]
    status: str
    model_config = ConfigDict(from_attributes=True)
