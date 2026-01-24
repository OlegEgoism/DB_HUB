# backend/schemas/db_query_schemas.py

from typing import Any

from pydantic import BaseModel, Field


class SQLQueryRequest(BaseModel):
    query: str = Field(..., min_length=5, max_length=5000, description="SQL-запрос (только SELECT)")
    limit: int = Field(
        default=100,
        ge=1,
        le=1000,
        description="Максимальное количество строк в результате (от 1 до 1000)",
    )


class SQLQueryResponse(BaseModel):
    connection_id: int
    query: str
    columns: list[str]
    rows: list[dict[str, Any]]
    total_rows: int
    truncated: bool = False
