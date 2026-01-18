# backend/schemas/db_query_monitoring_schemas.py
from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime


class SlowQueryInfo(BaseModel):
    pid: int
    username: str
    database: str
    client_addr: Optional[str]
    application_name: Optional[str]
    backend_start: datetime
    query_start: Optional[datetime]
    duration_ms: int
    state: str
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