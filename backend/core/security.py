# backend/core/security.py

from datetime import UTC, datetime, timedelta

import bcrypt
from backend.core.config import settings
from cryptography.fernet import Fernet
from jose import JWTError, jwt
from passlib.context import CryptContext

fernet = Fernet(settings.ENCRYPTION_KEY.encode())
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def encrypt_password(password: str) -> str:
    """Шифрует пароль и возвращает base64-строку"""
    return fernet.encrypt(password.encode()).decode()


def decrypt_password(encrypted_password: str) -> str:
    """Расшифровывает пароль из base64-строки"""
    return fernet.decrypt(encrypted_password.encode()).decode()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Проверяет пароль"""
    try:
        plain_bytes = plain_password.encode("utf-8")
        hashed_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(plain_bytes, hashed_bytes)
    except Exception:
        return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Создает JWT токен"""
    to_encode = data.copy()
    now = datetime.now(UTC)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": now})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str):
    """Декодирует JWT токен"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None


def get_password_hash(password: str) -> str:
    """Хеширует пароль"""
    salt = bcrypt.gensalt()
    password_bytes = password.encode("utf-8")
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode("utf-8")
