# backend/api/v1/app_auth.py

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    status,
)
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.limiter import limiter
from backend.core.security import decode_access_token
from backend.database.session import get_db
from backend.schemas.app_users_schemas import (
    ActiveSessionResponse,
    LoginRequest,
    Token,
    UserLoginResponse,
)
from backend.services.app_users_services import UserService

router = APIRouter(prefix="/app_auth", tags=["APP AUTHENTICATION"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/app_auth/login")


async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    user_service = UserService(db)
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверные учетные данные",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token_jti = payload.get("jti")
    if not token_jti or not await user_service.is_session_active(token_jti):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Сессия недействительна",
            headers={"WWW-Authenticate": "Bearer"},
        )
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
@limiter.limit("5/minute")
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
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
    result = await user_service.login_user(
        form_data.username,
        form_data.password,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
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
@limiter.limit("5/minute")
async def login_form(
    request: Request,
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    user_service = UserService(db)
    user = await user_service.get_user_by_username(login_data.username)
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
    result = await user_service.login_user(
        login_data.username,
        login_data.password,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
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
async def logout(
    token: str = Depends(oauth2_scheme),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_service = UserService(db)
    payload = decode_access_token(token)
    token_jti = payload.get("jti") if payload else None
    if token_jti:
        await user_service.revoke_session_by_jti(token_jti, revoked_by_user_id=current_user.id)
    return {"message": "Успешный выход из системы"}


def _assert_can_manage_sessions(current_user):
    if not (
        current_user.role == "Администратор БД"
        and current_user.is_active
        and current_user.is_superuser
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Недостаточно прав для управления сессиями")


@router.get("/sessions/active", response_model=list[ActiveSessionResponse])
async def get_active_sessions(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _assert_can_manage_sessions(current_user)
    user_service = UserService(db)
    return await user_service.list_active_sessions(exclude_user_id=current_user.id)


@router.post("/sessions/users/{user_id}/revoke")
async def revoke_user_sessions(
    user_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _assert_can_manage_sessions(current_user)
    user_service = UserService(db)
    success = await user_service.revoke_user_sessions(user_id, revoked_by_user_id=current_user.id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Активные сессии пользователя не найдены")
    return {"message": "Сессии пользователя завершены"}

@router.post("/validate-token")
async def validate_token(current_user=Depends(get_current_user)):
    return {
        "valid": True,
        "user": {
            "id": current_user.id,
            "username": current_user.username,
            "role": current_user.role,
            "is_active": current_user.is_active,
        },
    }
