# backend/schemas/db_functions_schemas.py

from pydantic import BaseModel, ConfigDict

from backend.utils.pagination import PaginatedServiceResponse


class FunctionInfo(BaseModel):
    schema_name: str
    function_name: str
    description: str | None = None
    definition: str


class PaginatedFunctionsResponse(PaginatedServiceResponse):
    functions: list[FunctionInfo]
    model_config = ConfigDict(from_attributes=True)
