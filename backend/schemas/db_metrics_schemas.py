from pydantic import BaseModel, ConfigDict, Field
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


# backend/schemas/db_metrics_schemas.py - добавьте в конец файла

class ActiveConnection(BaseModel):
    """Информация об активном подключении к БД"""
    user: str = Field(..., description="Имя пользователя БД")
    host: str = Field(..., description="Хост клиента")
    command: str = Field(..., description="Текущая команда/состояние")
    duration: str = Field(..., description="Время выполнения")
    status: str = Field(..., description="Состояние подключения")
    info: str = Field(..., description="Дополнительная информация")
    process_id: int = Field(..., description="PID процесса")
    database: Optional[str] = Field(None, description="Имя базы данных")
    connection_start: Optional[str] = Field(None, description="Время начала подключения")
    application: Optional[str] = Field(None, description="Имя приложения")


class ActiveConnectionsResponse(BaseModel):
    """Ответ с активными подключениями к БД"""
    connection_id: int
    connection_name: str
    host: str
    database_name: str
    total_connections: int = Field(..., description="Всего активных подключений")
    active_connections: List[ActiveConnection] = Field(..., description="Список активных подключений")
    status: str = Field(..., description="Статус выполнения запроса")
    model_config = ConfigDict(from_attributes=True)