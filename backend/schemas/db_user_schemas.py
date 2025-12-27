# backend/schemas/db_user_schemas.py
from pydantic import BaseModel, Field
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


class DBUserCreateRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=1)
    description: Optional[str] = Field(None, max_length=500)
    email: Optional[str] = Field(None, max_length=255)
    # Права роли
    rolsuper: bool = False
    rolinherit: bool = True
    rolcreaterole: bool = False
    rolcreatedb: bool = False
    rolcanlogin: bool = True
    rolreplication: bool = False
    rolconnlimit: int = Field(-1, ge=-1)
    rolvaliduntil: Optional[str] = None
