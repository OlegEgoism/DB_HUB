# backend/schemas/db_procedures_schemas.py
from pydantic import BaseModel, ConfigDict
from typing import List, Optional


class ProcedureInfo(BaseModel):
    schema_name: str
    procedure_name: str
    description: Optional[str] = None
    definition: str


class PaginatedProceduresResponse(BaseModel):
    connection_id: int
    connection_name: str
    total_procedures: int
    total_filtered_procedures: int
    page: int
    size: int
    pages: int
    has_next: bool
    has_prev: bool
    procedures: List[ProcedureInfo]

    model_config = ConfigDict(from_attributes=True)
