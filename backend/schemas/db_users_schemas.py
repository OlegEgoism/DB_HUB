# backend/schemas/db_users_schemas.py

import re

from pydantic import BaseModel, EmailStr, field_validator

from backend.utils.pagination import PaginatedResponse as BasePaginatedResponse

# Запрещённые имена
FORBIDDEN_NAMES = {
    "public",
    "none",
    "current_user",
    "session_user",
    "user",
    "admin",
    "root",
    "postgres",
    "guest",
    "test",
}
ROLE_NAME_PATTERN = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_]*$")


class DBUserCreate(BaseModel):
    username: str
    password: str
    email: EmailStr | None = None
    description: str | None = None

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        if not isinstance(v, str):
            raise ValueError("Имя пользователя должно быть строкой")
        v = v.strip()
        if not v:
            raise ValueError("Имя пользователя не может быть пустым")
        if len(v.encode("utf-8")) > 63:
            raise ValueError("Имя пользователя не может превышать 63 символа")
        if v.lower().startswith("pg_"):
            raise ValueError("Имя пользователя не может начинаться с 'pg_'")
        if v.lower() in FORBIDDEN_NAMES:
            raise ValueError(f"Имя '{v}' зарезервировано и не может использоваться для пользователя")
        if not ROLE_NAME_PATTERN.match(v):
            raise ValueError("Имя пользователя должно начинаться с латинской буквы или '_', и содержать только латинские буквы, цифры и символ '_'")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not isinstance(v, str):
            raise ValueError("Пароль должен быть строкой")
        if len(v) < 4:
            raise ValueError("Пароль должен содержать не менее 4 символов")
        if len(v) > 128:
            raise ValueError("Пароль слишком длинный (максимум 128 символов)")
        return v


class DBUserOut(BaseModel):
    oid: int
    name: str
    description: str | None = None
    email: str | None = None


class PaginatedDBUsersResponse(BasePaginatedResponse[DBUserOut]):
    """Пагинация пользователей БД"""

    pass


class DBUserUpdate(BaseModel):
    password: str | None = None
    description: str | None = None
    email: EmailStr | None = None

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if len(v) < 4:
            raise ValueError("Пароль должен содержать не менее 4 символов")
        if len(v) > 128:
            raise ValueError("Пароль слишком длинный (максимум 128 символов)")
        return v
