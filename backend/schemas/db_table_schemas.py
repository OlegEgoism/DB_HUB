# backend/schemas/db_table_schemas.py
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class TableInfo(BaseModel):
    oid: int
    table_name: str
    table_type: str
    owner: str
    description: Optional[str] = None
    size_bytes: int
    size_pretty: str
    estimated_row_count: Optional[int] = None

class PaginatedDBTablesResponse(BaseModel):
    connection_id: int
    schema_oid: int
    schema_name: str
    total_tables: int
    total_filtered_tables: int
    page: int
    size: int
    pages: int
    has_next: bool
    has_prev: bool
    tables: List[TableInfo]