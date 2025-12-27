# backend/schemas/db_user_schemas.py
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class DBUserInfo(BaseModel):
    id: int
    oid: int
    username: str
    description: Optional[str]
    email: Optional[str]
    created_at: datetime
    updated_at: datetime
    rolsuper: bool

class DBUsersResponse(BaseModel):
    connection_id: int
    total_users: int
    users: List[DBUserInfo]