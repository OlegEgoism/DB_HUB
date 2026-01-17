# backend/schemas/db_functions_schemas.py
from pydantic import BaseModel, ConfigDict
from typing import List, Optional


class FunctionInfo(BaseModel):
    schema_name: str
    function_name: str
    description: Optional[str] = None
    definition: str


class PaginatedFunctionsResponse(BaseModel):
    connection_id: int
    connection_name: str
    total_functions: int
    total_filtered_functions: int
    page: int
    size: int
    pages: int
    has_next: bool
    has_prev: bool
    functions: List[FunctionInfo]
    model_config = ConfigDict(from_attributes=True)
