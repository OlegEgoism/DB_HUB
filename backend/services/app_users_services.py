# backend/services/app_users_services.py
import re
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from backend.models.user import User
from backend.schemas.app_users_schemas import UserCreate, UserUpdate
from datetime import datetime
from backend.core.security import verify_password, create_access_token, get_password_hash


class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user(self, user_id: int) -> Optional[User]:
        """Получить пользователя по id"""
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        return user

    async def get_user_by_username(self, username: str) -> Optional[User]:
        """Получить пользователя по username"""
        result = await self.db.execute(select(User).where(User.username == username))
        user = result.scalar_one_or_none()
        return user

    @staticmethod
    def validate_password(password: str, username: str) -> None:
        """Валидация пароля"""
        if len(password) < 4:
            raise ValueError("Пароль должен содержать минимум 4 символа")
        if password == username:
            raise ValueError("Пароль не должен совпадать с логином")
        if re.search(r'\s', password):
            raise ValueError("Пароль не должен содержать пробелы")

    @staticmethod
    def hash_password(password: str) -> str:
        """Хеширование пароля с использованием bcrypt напрямую"""
        return get_password_hash(password)

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Проверка пароля"""
        return verify_password(plain_password, hashed_password)

    async def check_email_exists(self, email: str, exclude_user_id: Optional[int] = None) -> bool:
        """Проверка, используется ли email другим пользователем"""
        query = select(User).where(User.email == email)
        if exclude_user_id:
            query = query.where(User.id != exclude_user_id)
        result = await self.db.execute(query)
        user = result.scalar_one_or_none()
        return user is not None

    async def create_user(self, user_data: UserCreate) -> User:
        """Создание нового пользователя с валидацией"""
        self.validate_password(user_data.password, user_data.username)
        if await self.check_email_exists(user_data.email):
            raise ValueError("Email уже используется другим пользователем")
        existing_user = await self.get_user_by_username(user_data.username)
        if existing_user:
            raise ValueError("Пользователь с таким username уже существует")
        hashed_password = self.hash_password(user_data.password)
        user = User(username=user_data.username, email=user_data.email, hashed_password=hashed_password, fio=user_data.fio, role=user_data.role, is_active=False, is_superuser=False)
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def update_user(self, user_id: int, user_data: UserUpdate) -> Optional[User]:
        """Обновление пользователя"""
        user = await self.get_user(user_id)
        if not user:
            return None
        if user_data.email and user_data.email != user.email:
            if await self.check_email_exists(user_data.email, exclude_user_id=user_id):
                raise ValueError("Email уже используется другим пользователем")
        update_data = user_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if value is not None:
                setattr(user, field, value)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def delete_user(self, user_id: int) -> bool:
        """Удаление пользователя"""
        user = await self.get_user(user_id)
        if not user:
            return False
        await self.db.delete(user)
        await self.db.commit()
        return True

    async def authenticate_user(self, username: str, password: str) -> Optional[User]:
        """Аутентификация пользователя"""
        user = await self.get_user_by_username(username)
        if not user:
            return None
        if not self.verify_password(password, user.hashed_password):
            return None
        if not user.is_active:
            return None
        return user

    async def update_last_login(self, user_id: int) -> None:
        """Обновление времени последнего входа"""
        await self.db.execute(update(User).where(User.id == user_id).values(last_login=datetime.utcnow()))
        await self.db.commit()

    async def login_user(self, username: str, password: str) -> Optional[dict]:
        """Вход пользователя и генерация токена"""
        user = await self.authenticate_user(username, password)
        if not user:
            return None
        await self.update_last_login(user.id)
        access_token = create_access_token(data={"sub": user.username, "user_id": user.id, "role": user.role})
        return {"user": {"id": user.id, "username": user.username, "email": user.email, "fio": user.fio, "role": user.role, "is_active": user.is_active, "is_superuser": user.is_superuser, "last_login": user.last_login}, "access_token": access_token, "token_type": "bearer"}

    async def get_current_user_from_token(self, token: str) -> Optional[User]:
        """Получение текущего пользователя из токена"""
        from backend.core.security import decode_access_token
        payload = decode_access_token(token)
        if not payload:
            return None
        username = payload.get("sub")
        if not username:
            return None
        user = await self.get_user_by_username(username)
        return user
