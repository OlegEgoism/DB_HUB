# backend/core/config.py
from pydantic_settings import BaseSettings
from pydantic import Field, validator
import base64


class Settings(BaseSettings):
    """PostgreSQL приложения"""

    DB_HOST: str = Field(..., env="DB_HOST")
    DB_PORT: int = Field(..., env="DB_PORT")
    DB_NAME: str = Field(..., env="DB_NAME")
    DB_USER: str = Field(..., env="DB_USER")
    DB_PASSWORD: str = Field(..., env="DB_PASSWORD")

    """Ключ шифрования для паролей подключений"""
    ENCRYPTION_KEY: str = Field(..., env="ENCRYPTION_KEY")

    """FastAPI"""
    HOST: str = Field("127.0.0.1", env="HOST")
    PORT: int = Field(8000, env="PORT")

    """JWT"""
    SECRET_KEY: str = Field("your-secret-key-here", env="SECRET_KEY")
    ALGORITHM: str = Field("HS256", env="ALGORITHM")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(30, env="ACCESS_TOKEN_EXPIRE_MINUTES")

    """Refresh Token"""
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(7, env="refresh_token_expire_days")

    @validator("ENCRYPTION_KEY")
    def validate_encryption_key(cls, v):
        try:
            base64.urlsafe_b64decode(v)
        except Exception as e:
            raise ValueError(
                "ENCRYPTION_KEY должен быть валидным 32-байтным base64-ключом"
            ) from e
        return v

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
