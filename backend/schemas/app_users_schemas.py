# backend/schemas/app_users_schemas.py
import re
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

from backend.models.user import ROLE_CHOICES
from backend.utils.pagination import PaginatedResponse as BasePaginatedResponse


class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    fio: str | None = Field(None, max_length=100)
    role: str = Field(default="Пользователь")
    is_active: bool | None = False
    is_superuser: bool | None = False

    @field_validator("role")
    @classmethod
    def validate_role(cls, v):
        if v not in ROLE_CHOICES:
            raise ValueError(f"Роль должна быть одной из: {', '.join(ROLE_CHOICES)}")
        return v


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    fio: str | None = Field(None, max_length=100)
    role: str = Field(default="Пользователь")
    password: str

    @field_validator("role")
    @classmethod
    def validate_role(cls, v):
        if v not in ROLE_CHOICES:
            raise ValueError(f"Роль должна быть одной из: {', '.join(ROLE_CHOICES)}")
        return v


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    fio: str | None = Field(None, max_length=100)
    role: str = Field(default="Пользователь")
    is_active: bool | None = None
    is_superuser: bool | None = None

    @field_validator("role")
    @classmethod
    def validate_role(cls, v):
        if v is not None and v not in ROLE_CHOICES:
            raise ValueError(f"Роль должна быть одной из: {', '.join(ROLE_CHOICES)}")
        return v


class ChangePasswordRequest(BaseModel):
    """Схема для смены пароля"""

    new_password: str = Field(..., min_length=4, max_length=128, description="Новый пароль")

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 4:
            raise ValueError("Пароль должен содержать минимум 4 символа")
        if len(v) > 128:
            raise ValueError("Пароль слишком длинный (максимум 128 символов)")
        if re.search(r"\s", v):
            raise ValueError("Пароль не должен содержать пробелы")
        return v


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    username: str | None = None
    user_id: int | None = None


class LoginRequest(BaseModel):
    username: str
    password: str


class UserLoginResponse(BaseModel):
    user: dict
    token: Token


class UserInDB(UserBase):
    id: int
    is_active: bool
    is_superuser: bool
    created_at: datetime
    updated_at: datetime
    last_login: datetime | None = None

    class Config:
        from_attributes = True


class UserResponse(UserInDB):
    pass


class UserProfile(BaseModel):
    id: int
    username: str
    email: str
    fio: str | None
    role: str
    is_active: bool
    is_superuser: bool
    created_at: datetime
    last_login: datetime | None = None

    class Config:
        from_attributes = True


class PaginatedResponse(BasePaginatedResponse[UserResponse]):
    """Схема для ответа с пагинацией"""

    pass
