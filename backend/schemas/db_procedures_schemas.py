# backend/schemas/db_procedures_schemas.py

from pydantic import BaseModel, ConfigDict


class ProcedureInfo(BaseModel):
    schema_name: str
    procedure_name: str
    description: str | None = None
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
    procedures: list[ProcedureInfo]

    model_config = ConfigDict(from_attributes=True)
