# backend/schemas/db_indexes_schemas.py

from pydantic import BaseModel, ConfigDict

from backend.utils.pagination import PaginatedServiceResponse


class IndexInfo(BaseModel):
    schema_name: str
    index_name: str
    table_name: str
    description: str | None = None
    definition: str


class PaginatedIndexesResponse(PaginatedServiceResponse):
    indexes: list[IndexInfo]
    model_config = ConfigDict(from_attributes=True)
