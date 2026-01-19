# backend/schemas/app_users_schemas.py
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List
from datetime import datetime
from backend.models.user import ROLE_CHOICES


class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    fio: Optional[str] = Field(None, max_length=100)
    role: str = Field(default="Пользователь")
    is_active: Optional[bool] = False
    is_superuser: Optional[bool] = False

    @field_validator("role")
    @classmethod
    def validate_role(cls, v):
        if v not in ROLE_CHOICES:
            raise ValueError(f"Роль должна быть одной из: {', '.join(ROLE_CHOICES)}")
        return v


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    fio: Optional[str] = Field(None, max_length=100)
    role: str = Field(default="Пользователь")
    password: str

    @field_validator("role")
    @classmethod
    def validate_role(cls, v):
        if v not in ROLE_CHOICES:
            raise ValueError(f"Роль должна быть одной из: {', '.join(ROLE_CHOICES)}")
        return v


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    fio: Optional[str] = Field(None, max_length=100)
    role: Optional[str] = None
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None

    @field_validator("role")
    @classmethod
    def validate_role(cls, v):
        if v is not None and v not in ROLE_CHOICES:
            raise ValueError(f"Роль должна быть одной из: {', '.join(ROLE_CHOICES)}")
        return v


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    username: Optional[str] = None
    user_id: Optional[int] = None


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
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserResponse(UserInDB):
    pass


class UserProfile(BaseModel):
    id: int
    username: str
    email: str
    fio: Optional[str]
    role: str
    is_active: bool
    is_superuser: bool
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


class PaginatedResponse(BaseModel):
    """Схема для ответа с пагинацией"""

    items: List[UserResponse]
    total: int
    page: int
    size: int
    pages: int
    has_next: bool
    has_prev: bool

    class Config:
        from_attributes = True
