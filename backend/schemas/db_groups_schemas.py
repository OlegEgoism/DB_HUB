# backend/services/db_groups_schemas.py

import re

from pydantic import BaseModel, field_validator

from backend.utils.pagination import PaginatedResponse as BasePaginatedResponse

# Запрещённые имена
FORBIDDEN_NAMES = {
    "public",
    "none",
    "current_user",
    "session_user",
    "user",
    "default",
    "all",
    "postgres",
    "admin",
    "root",
    "guest",
}
ROLE_NAME_PATTERN = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_]*$")


class DBGroupOut(BaseModel):
    oid: int
    name: str
    description: str | None = None
    user_count: int


class PaginatedDBGroupsResponse(BasePaginatedResponse[DBGroupOut]):
    """Пагинация групп"""

    pass


class DBGroupUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    model_config = {"extra": "forbid"}


class DBGroupCreate(BaseModel):
    name: str
    description: str | None = None
    model_config = {"extra": "forbid"}

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not isinstance(v, str):
            raise ValueError("Имя должно быть строкой")
        v = v.strip()
        if not v:
            raise ValueError("Имя группы не может быть пустым")
        if len(v.encode("utf-8")) > 63:
            raise ValueError("Имя группы не может превышать 63 символа")
        if v.lower().startswith("pg_"):
            raise ValueError("Имя группы не может начинаться с 'pg_'")
        if v.lower() in FORBIDDEN_NAMES:
            raise ValueError(f"Имя '{v}' зарезервировано и не может использоваться для группы")
        if not ROLE_NAME_PATTERN.match(v):
            raise ValueError("Имя группы должно начинаться с буквы или '_', и содержать только латинские буквы, цифры и символ '_'")
        return v


class DBUserInGroup(BaseModel):
    oid: int
    name: str


class DBGroupWithUsersOut(BaseModel):
    oid: int
    name: str
    description: str | None = None
    user_count: int
    users: list[DBUserInGroup]


class AddUserToGroupRequest(BaseModel):
    user_oid: int


class RemoveUserFromGroupRequest(BaseModel):
    user_oid: int
