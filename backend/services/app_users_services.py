# backend/services/app_users_services.py
import re
from datetime import datetime, timedelta
from uuid import uuid4

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.config import settings
from backend.core.security import (
    create_access_token,
    get_password_hash,
    verify_password,
)
from backend.models.user import User
from backend.models.user_session import UserSession
from backend.schemas.app_users_schemas import UserCreate, UserUpdate


class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user(self, user_id: int) -> User | None:
        """Получить пользователя по id"""
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        return user

    async def get_user_by_username(self, username: str) -> User | None:
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
        if re.search(r"\s", password):
            raise ValueError("Пароль не должен содержать пробелы")

    @staticmethod
    def hash_password(password: str) -> str:
        """Хеширование пароля с использованием bcrypt напрямую"""
        return get_password_hash(password)

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Проверка пароля"""
        return verify_password(plain_password, hashed_password)

    async def check_email_exists(self, email: str, exclude_user_id: int | None = None) -> bool:
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
            raise ValueError("Имя пользователя уже существует")
        hashed_password = self.hash_password(user_data.password)
        user = User(
            username=user_data.username,
            email=user_data.email,
            hashed_password=hashed_password,
            fio=user_data.fio,
            role=user_data.role,
            is_active=False,
            is_superuser=False,
        )
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def update_user(self, user_id: int, user_data: UserUpdate) -> User | None:
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

    async def change_user_password(self, user_id: int, new_password: str) -> bool:
        """Смена пароля пользователя без указания текущего пароля"""
        user = await self.get_user(user_id)
        if not user:
            return False
        self.validate_password(new_password, user.username)
        current_hashed_password = user.hashed_password
        hashed_new_password = self.hash_password(new_password)
        if self.verify_password(new_password, current_hashed_password):
            raise ValueError("Новый пароль не должен совпадать с текущим паролем")
        user.hashed_password = hashed_new_password
        await self.db.commit()
        await self.db.refresh(user)
        return True

    async def delete_user(self, user_id: int) -> bool:
        """Удаление пользователя"""
        user = await self.get_user(user_id)
        if not user:
            return False
        await self.db.delete(user)
        await self.db.commit()
        return True

    async def authenticate_user(self, username: str, password: str) -> User | None:
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

    async def login_user(
        self,
        username: str,
        password: str,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> dict | None:
        """Вход пользователя и генерация токена"""
        user = await self.authenticate_user(username, password)
        if not user:
            return None
        await self.update_last_login(user.id)
        token_jti = str(uuid4())
        expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.username, "user_id": user.id, "role": user.role, "jti": token_jti},
            expires_delta=expires_delta,
        )
        expires_at = datetime.utcnow() + expires_delta
        self.db.add(
            UserSession(
                user_id=user.id,
                token_jti=token_jti,
                ip_address=ip_address,
                user_agent=user_agent[:500] if user_agent else None,
                expires_at=expires_at,
            )
        )
        await self.db.flush()
        return {
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "fio": user.fio,
                "role": user.role,
                "is_active": user.is_active,
                "is_superuser": user.is_superuser,
                "last_login": user.last_login,
            },
            "access_token": access_token,
            "token_type": "bearer",
        }

    async def is_session_active(self, token_jti: str) -> bool:
        now = datetime.utcnow()
        result = await self.db.execute(
            select(UserSession).where(
                UserSession.token_jti == token_jti,
                UserSession.is_active.is_(True),
                UserSession.revoked_at.is_(None),
                UserSession.expires_at > now,
            )
        )
        session = result.scalar_one_or_none()
        if not session:
            return False
        session.last_seen_at = now
        await self.db.flush()
        return True

    async def revoke_session_by_jti(self, token_jti: str, revoked_by_user_id: int | None = None) -> bool:
        result = await self.db.execute(select(UserSession).where(UserSession.token_jti == token_jti))
        session = result.scalar_one_or_none()
        if not session:
            return False
        session.is_active = False
        session.revoked_at = datetime.utcnow()
        session.revoked_by_user_id = revoked_by_user_id
        await self.db.flush()
        return True

    async def revoke_user_sessions(self, user_id: int, revoked_by_user_id: int) -> bool:
        now = datetime.utcnow()
        result = await self.db.execute(
            select(UserSession).where(
                UserSession.user_id == user_id,
                UserSession.is_active.is_(True),
                UserSession.revoked_at.is_(None),
            )
        )
        sessions = result.scalars().all()
        if not sessions:
            return False
        for session in sessions:
            session.is_active = False
            session.revoked_at = now
            session.revoked_by_user_id = revoked_by_user_id
        await self.db.flush()
        return True

    async def list_active_sessions(self, exclude_user_id: int | None = None) -> list[dict]:
        now = datetime.utcnow()
        query = (
            select(
                User.id,
                User.username,
                User.fio,
                User.role,
                User.is_active,
                User.is_superuser,
                func.max(UserSession.last_seen_at),
                func.max(UserSession.created_at),
                func.count(UserSession.id),
            )
            .join(
                UserSession,
                (UserSession.user_id == User.id)
                & UserSession.is_active.is_(True)
                & UserSession.revoked_at.is_(None)
                & (UserSession.expires_at > now),
            )
            .where(User.is_active.is_(True))
            .group_by(User.id, User.username, User.fio, User.role, User.is_active, User.is_superuser)
            .order_by(func.max(UserSession.last_seen_at).desc())
        )
        if exclude_user_id is not None:
            query = query.where(User.id != exclude_user_id)
        result = await self.db.execute(query)
        rows = result.all()
        return [
            {
                "session_id": None,
                "user_id": user_id,
                "username": username,
                "fio": fio,
                "role": role,
                "is_active": is_active,
                "is_superuser": is_superuser,
                "created_at": created_at,
                "last_seen_at": last_seen_at,
                "ip_address": None,
                "user_agent": None,
                "active_sessions": active_sessions,
            }
            for (
                user_id,
                username,
                fio,
                role,
                is_active,
                is_superuser,
                last_seen_at,
                created_at,
                active_sessions,
            ) in rows
        ]

    async def get_current_user_from_token(self, token: str) -> User | None:
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
