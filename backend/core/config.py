# backend/core/config.py

import base64

from pydantic import Field, validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # SQLite (метаданные приложения: пользователи, сохранённые подключения)
    APP_DATABASE_URL: str = Field("sqlite+aiosqlite:///./db_hub.sqlite3", env="APP_DATABASE_URL")

    # Ключ Fernet (base64) для шифрования паролей внешних БД в БД приложения
    ENCRYPTION_KEY: str = Field(
        "EBvGmpvcm4nrUrcMjmjfwUB0F0usPXfRCOHVvK3upCo=",
        env="ENCRYPTION_KEY",
    )

    HOST: str = Field("127.0.0.1", env="HOST")
    PORT: int = Field(8000, env="PORT")

    SECRET_KEY: str = Field(
        "your-super-secret-jwt-key-change-this-in-production",
        env="SECRET_KEY",
    )
    ALGORITHM: str = Field("HS256", env="ALGORITHM")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(30, env="ACCESS_TOKEN_EXPIRE_MINUTES")

    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(7, env="REFRESH_TOKEN_EXPIRE_DAYS")

    @validator("ENCRYPTION_KEY")
    def validate_encryption_key(cls, v):
        try:
            base64.urlsafe_b64decode(v)
        except Exception as e:
            raise ValueError("ENCRYPTION_KEY должен быть валидным 32-байтным base64-ключом") from e
        return v

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
