# backend/schemas/db_user_schemas.py
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta


def _default_rolvaliduntil_example() -> str:
    """Возвращает пример даты: сейчас + 1 год в ISO 8601"""
    now = datetime.now(timezone.utc)
    next_year = now + timedelta(days=365)
    return next_year.isoformat()


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
    connection_name: Optional[str] = None
    total_users: int
    total_filtered_users: int
    page: int
    size: int
    pages: int
    has_next: bool
    has_prev: bool
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
    rolvaliduntil: Optional[str] = Field(
        None,
        description="Дата окончания действия пароля в формате ISO 8601 (например, 2026-12-31T23:59:59). Укажите null для бессрочного действия.",
        examples=[_default_rolvaliduntil_example()]
    )


class DBUserUpdateRequest(BaseModel):
    username: Optional[str] = Field(None, min_length=1, max_length=100)
    password: Optional[str] = Field(None, min_length=1)
    description: Optional[str] = Field(None, max_length=500)
    email: Optional[str] = Field(None, max_length=255)
    # Права роли
    rolsuper: Optional[bool] = None
    rolinherit: Optional[bool] = None
    rolcreaterole: Optional[bool] = None
    rolcreatedb: Optional[bool] = None
    rolcanlogin: Optional[bool] = None
    rolreplication: Optional[bool] = None
    rolconnlimit: Optional[int] = Field(None, ge=-1)
    rolvaliduntil: Optional[str] = Field(
        None,
        description="Дата окончания действия пароля в формате ISO 8601 (например, 2026-12-31T23:59:59). Укажите null для бессрочного действия.",
        examples=[_default_rolvaliduntil_example()]
    )


class AddRemoveUserToGroupRequest(BaseModel):
    user_id: int = Field(..., gt=0, description="ID пользователя в локальной БД")
    group_id: int = Field(..., gt=0, description="ID группы в локальной БД")