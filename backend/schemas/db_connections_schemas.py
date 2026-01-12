# backend/schemas/db_connections_schemas.py
from datetime import datetime
from typing import Optional, Literal, List
from pydantic import BaseModel, Field, validator, ConfigDict

Environment = Literal['production', 'development', 'testing', 'analytics']
DatabaseType = Literal['postgresql']


class ConnectionBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    database_type: DatabaseType
    environment: Environment = 'production'
    is_favorite: bool = False
    host: str
    port: int
    database_name: str
    username: str

    @validator('port')
    def validate_port(cls, v):
        if not (1 <= v <= 65535):
            raise ValueError("Порт должен быть в диапазоне 1–65535")
        return v


class ConnectionCreate(ConnectionBase):
    password: str
    owner_id: int


class ConnectionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    database_type: Optional[DatabaseType] = None
    environment: Optional[Environment] = None
    is_favorite: Optional[bool] = None
    host: Optional[str] = None
    port: Optional[int] = None
    database_name: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    owner_id: Optional[int] = None


class ConnectionOut(BaseModel):
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
    db_size_mb: Optional[float]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PaginatedConnectionResponse(BaseModel):
    items: List[ConnectionOut]
    total: int
    page: int
    size: int
    pages: int
    has_next: bool
    has_prev: bool
    model_config = ConfigDict(from_attributes=True)


class ActiveConnectionInfo(BaseModel):
    pid: int
    username: str
    application_name: Optional[str]
    client_addr: Optional[str]
    client_hostname: Optional[str]
    client_port: Optional[int]
    backend_start: datetime
    query_start: Optional[datetime]
    state_change: Optional[datetime]
    state: str
    query: str


class PaginatedActiveConnectionsResponse(BaseModel):
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
    model_config = ConfigDict(from_attributes=True)


class TerminateConnectionRequest(BaseModel):
    pid: int = Field(..., gt=0, description="PID процесса, который нужно завершить")


class ConnectionFavoriteUpdate(BaseModel):
    is_favorite: bool





