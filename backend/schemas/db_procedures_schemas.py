# backend/schemas/db_procedures_schemas.py

from pydantic import BaseModel, ConfigDict

from backend.utils.pagination import PaginatedServiceResponse


class ProcedureInfo(BaseModel):
    schema_name: str
    procedure_name: str
    description: str | None = None
    definition: str


class PaginatedProceduresResponse(PaginatedServiceResponse):
    procedures: list[ProcedureInfo]
    model_config = ConfigDict(from_attributes=True)
