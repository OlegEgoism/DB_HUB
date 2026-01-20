# backend/api/v1/app_auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from backend.database.session import get_db
from backend.services.app_users_services import UserService
from backend.schemas.app_users_schemas import (
    LoginRequest,
    Token,
    UserLoginResponse,
    UserProfile,
)

router = APIRouter(prefix="/app_auth", tags=["APP AUTHENTICATION"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    """Зависимость для получения текущего пользователя"""
    user_service = UserService(db)
    user = await user_service.get_current_user_from_token(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверные учетные данные",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Пользователь неактивен")
    return user


@router.post("/login", response_model=UserLoginResponse)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    """Вход пользователя и получение токена"""
    user_service = UserService(db)
    user = await user_service.get_user_by_username(form_data.username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный логин или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Учетная запись не активирована. Обратитесь к администратору.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    result = await user_service.login_user(form_data.username, form_data.password)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный логин или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return UserLoginResponse(
        user=result["user"],
        token=Token(access_token=result["access_token"], token_type=result["token_type"]),
    )


@router.post("/login-form", response_model=UserLoginResponse)
async def login_form(login_data: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Альтернативный endpoint для входа с JSON данными"""
    user_service = UserService(db)
    result = await user_service.login_user(login_data.username, login_data.password)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный логин или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return UserLoginResponse(
        user=result["user"],
        token=Token(access_token=result["access_token"], token_type=result["token_type"]),
    )


@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """Выход пользователя (клиент должен удалить токен)"""
    return {"message": "Успешный выход из системы"}


@router.get("/me", response_model=UserProfile)
async def get_current_user_profile(current_user=Depends(get_current_user)):
    """Получение профиля текущего пользователя"""
    return current_user


@router.post("/validate-token")
async def validate_token(current_user=Depends(get_current_user)):
    """Проверка валидности токена"""
    return {
        "valid": True,
        "user": {
            "id": current_user.id,
            "username": current_user.username,
            "role": current_user.role,
            "is_active": current_user.is_active,
        },
    }
