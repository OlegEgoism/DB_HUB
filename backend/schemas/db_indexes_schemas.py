# backend/schemas/db_indexes_schemas.py
from pydantic import BaseModel, ConfigDict
from typing import List, Optional


class IndexInfo(BaseModel):
    schema_name: str
    index_name: str
    table_name: str
    description: Optional[str] = None
    definition: str


class PaginatedIndexesResponse(BaseModel):
    connection_id: int
    connection_name: str
    total_indexes: int
    total_filtered_indexes: int
    page: int
    size: int
    pages: int
    has_next: bool
    has_prev: bool
    indexes: List[IndexInfo]
    model_config = ConfigDict(from_attributes=True)
