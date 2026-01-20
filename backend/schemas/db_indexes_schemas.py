# backend/schemas/db_indexes_schemas.py
from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from backend.utils.pagination import PaginatedServiceResponse


class IndexInfo(BaseModel):
    schema_name: str
    index_name: str
    table_name: str
    description: Optional[str] = None
    definition: str


class PaginatedIndexesResponse(PaginatedServiceResponse):
    indexes: List[IndexInfo]
    model_config = ConfigDict(from_attributes=True)
