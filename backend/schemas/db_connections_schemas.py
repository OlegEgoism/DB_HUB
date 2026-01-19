# backend/schemas/db_connections_schemas.py
from datetime import datetime
from typing import Optional, Literal, List
from pydantic import BaseModel, Field, field_validator, ConfigDict

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
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=255)
    database_type: Optional[DatabaseType] = None
    environment: Optional[Environment] = None
    is_favorite: Optional[bool] = None
    host: Optional[str] = None
    port: Optional[int] = Field(None, ge=1, le=65535)
    database_name: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    owner_id: Optional[int] = None

    @field_validator("port")
    @classmethod
    def validate_port_update(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and not (1 <= v <= 65535):
            raise ValueError("Порт должен быть в диапазоне 1–65535")
        return v


class ConnectionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    database_name: str
    description: Optional[str] = None
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
    db_size_mb: Optional[float] = None
    created_at: datetime
    updated_at: datetime


class PaginatedConnectionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    items: List[ConnectionOut]
    total: int
    page: int
    size: int
    pages: int
    has_next: bool
    has_prev: bool


class ActiveConnectionInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    pid: int
    username: Optional[str] = None  # ← ИСПРАВЛЕНО: было str → стало Optional[str]
    application_name: Optional[str] = None
    client_addr: Optional[str] = None
    client_hostname: Optional[str] = None
    client_port: Optional[int] = None
    backend_start: datetime
    query_start: Optional[datetime] = None
    state_change: Optional[datetime] = None
    state: Optional[str] = None  # ← также может быть NULL
    query: str


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
    active_connections: List[ActiveConnectionInfo]


class TerminateConnectionRequest(BaseModel):
    pid: int = Field(..., gt=0, description="PID процесса, который нужно завершить")


class ConnectionFavoriteUpdate(BaseModel):
    is_favorite: bool
