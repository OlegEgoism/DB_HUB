# backend/schemas/db_views_schemas.py

from pydantic import BaseModel, ConfigDict


class ViewInfo(BaseModel):
    schema_name: str
    view_name: str
    description: str | None = None
    definition: str


class PaginatedViewsResponse(BaseModel):
    connection_id: int
    connection_name: str
    total_views: int
    total_filtered_views: int
    page: int
    size: int
    pages: int
    has_next: bool
    has_prev: bool
    views: list[ViewInfo]
    model_config = ConfigDict(from_attributes=True)


class MaterializedViewInfo(BaseModel):
    schema_name: str
    view_name: str
    description: str | None = None
    definition: str


class PaginatedMaterializedViewsResponse(BaseModel):
    connection_id: int
    connection_name: str
    total_materialized_views: int
    total_filtered_materialized_views: int
    page: int
    size: int
    pages: int
    has_next: bool
    has_prev: bool
    materialized_views: list[MaterializedViewInfo]
    model_config = ConfigDict(from_attributes=True)
