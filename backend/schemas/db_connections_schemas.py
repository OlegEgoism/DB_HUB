# backend/schemas/db_connections_schemas.py
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from backend.utils.pagination import PaginatedResponse as BasePaginatedResponse

Environment = Literal["production", "development", "testing", "analytics"]
DatabaseType = Literal["postgresql", "greenplum"]


class ConnectionBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    database_type: DatabaseType
    environment: Environment
    is_favorite: bool = False
    host: str
    port: int = Field(5432, ge=1, le=65535)
    database_name: str
    username: str

    @field_validator("port")
    @classmethod
    def validate_port(cls, v: int) -> int:
        if not (1 <= v <= 65535):
            raise ValueError("Порт должен быть в диапазоне 1–65535")
        return v


class ConnectionCreate(ConnectionBase):
    password: str
    owner_id: int


class ConnectionUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = Field(None, max_length=255)
    database_type: DatabaseType | None = None
    environment: Environment | None = None
    is_favorite: bool | None = None
    host: str | None = None
    port: int | None = Field(None, ge=1, le=65535)
    database_name: str | None = None
    username: str | None = None
    password: str | None = None
    owner_id: int | None = None

    @field_validator("port")
    @classmethod
    def validate_port_update(cls, v: int | None) -> int | None:
        if v is not None and not (1 <= v <= 65535):
            raise ValueError("Порт должен быть в диапазоне 1–65535")
        return v


class ConnectionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    database_name: str
    description: str | None = None
    host: str
    port: int
    username: str
    name: str
    database_type: str
    environment: str
    is_favorite: bool
    owner_id: int
    owner_username: str
    status: str
    db_size_mb: float | None = None
    created_at: datetime
    updated_at: datetime


class PaginatedConnectionResponse(BasePaginatedResponse[ConnectionOut]):
    """Пагинация подключений"""

    pass


class ActiveConnectionInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    pid: int
    username: str | None = None
    application_name: str | None = None
    client_addr: str | None = None
    client_hostname: str | None = None
    client_port: int | None = None
    backend_start: datetime
    query_start: datetime | None = None
    state_change: datetime | None = None
    state: str | None = None
    query: str
    duration_ms: int | None = None


class PaginatedActiveConnectionsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    connection_id: int
    connection_name: str
    total_active_connections: int
    total_filtered_connections: int
    page: int
    size: int
    pages: int
    has_next: bool
    has_prev: bool
    active_connections: list[ActiveConnectionInfo]


class TerminateConnectionRequest(BaseModel):
    pid: int = Field(..., gt=0, description="PID процесса, который нужно завершить")


class ConnectionFavoriteUpdate(BaseModel):
    is_favorite: bool
