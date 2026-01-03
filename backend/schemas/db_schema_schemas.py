# backend/schemas/db_schema_schemas.py
from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional


class TableInfo(BaseModel):
    table_name: str
    owner: str
    description: Optional[str] = None
    row_count: int = Field(..., description="Оценка количества строк (pg_class.reltuples)")
    size_bytes: int = Field(..., description="Размер таблицы в байтах (pg_total_relation_size)")
    size_pretty: str = Field(..., description="Человекочитаемый размер MB")


class SchemaInfo(BaseModel):
    schema_name: str
    description: Optional[str] = None
    tables: List[TableInfo]


class PaginatedSchemasWithTablesResponse(BaseModel):
    connection_id: int
    connection_name: str
    total_schemas: int
    total_filtered_schemas: int
    page: int
    size: int
    pages: int
    has_next: bool
    has_prev: bool
    schemas: List[SchemaInfo]
    model_config = ConfigDict(from_attributes=True)


class PaginatedTemporaryTablesResponse(BaseModel):
    connection_id: int
    connection_name: str
    total_temp_tables: int
    total_filtered_temp_tables: int
    page: int
    size: int
    pages: int
    has_next: bool
    has_prev: bool
    temporary_tables: List[TableInfo]
    model_config = ConfigDict(from_attributes=True)
