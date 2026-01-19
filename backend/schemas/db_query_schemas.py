# backend/schemas/db_query_schemas.py
from pydantic import BaseModel, Field
from typing import List, Any, Dict


class SQLQueryRequest(BaseModel):
    query: str = Field(..., min_length=5, max_length=5000, description="SQL-запрос (только SELECT)")
    limit: int = Field(
        default=100,
        ge=1,
        le=1000,
        description="Максимальное количество строк в результате (от 1 до 1000)"
    )

class SQLQueryResponse(BaseModel):
    connection_id: int
    query: str
    columns: List[str]
    rows: List[Dict[str, Any]]
    total_rows: int
    truncated: bool = False