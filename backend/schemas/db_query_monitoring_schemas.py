# backend/schemas/db_query_monitoring_schemas.py
from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime


class SlowQueryInfo(BaseModel):
    pid: int
    username: Optional[str] = None
    database: Optional[str] = None
    client_addr: Optional[str] = None
    application_name: Optional[str] = None
    backend_start: Optional[datetime] = None
    query_start: Optional[datetime] = None
    duration_ms: int
    state: Optional[str] = None
    query: str


class PaginatedSlowQueriesResponse(BaseModel):
    connection_id: int
    connection_name: str
    min_duration_ms: int
    total_filtered_slow_queries: int
    page: int
    size: int
    pages: int
    has_next: bool
    has_prev: bool
    slow_queries: List[SlowQueryInfo]
    model_config = ConfigDict(from_attributes=True)
