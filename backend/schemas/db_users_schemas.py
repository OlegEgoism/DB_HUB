# backend/schemas/db_users_schemas.py
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

class DBUserOut(BaseModel):
    oid: int
    name: str
    description: Optional[str] = None
    email: Optional[str] = None  # ← добавлено

class PaginatedDBUsersResponse(BaseModel):
    items: List[DBUserOut]
    total: int
    page: int
    size: int
    pages: int
    has_next: bool
    has_prev: bool