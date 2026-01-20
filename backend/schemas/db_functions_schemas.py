# backend/schemas/db_functions_schemas.py
from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from backend.utils.pagination import PaginatedServiceResponse


class FunctionInfo(BaseModel):
    schema_name: str
    function_name: str
    description: Optional[str] = None
    definition: str


class PaginatedFunctionsResponse(PaginatedServiceResponse):
    functions: List[FunctionInfo]
    model_config = ConfigDict(from_attributes=True)
