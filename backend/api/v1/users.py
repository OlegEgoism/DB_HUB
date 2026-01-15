# backend/api/v1/users.py
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, func
from backend.database.session import get_db
from backend.models.user import User
from backend.services.users_services import UserService
from backend.schemas.users_schemas import (
    UserResponse,
    UserCreate,
    UserUpdate,
    PaginatedResponse
)

router = APIRouter(prefix="/users", tags=["USERS APP"])


@router.get("/", response_model=PaginatedResponse)
async def list_users(
        db: AsyncSession = Depends(get_db),
        page: int = Query(1, ge=1, description="Номер страницы"),
        size: int = Query(20, ge=1, le=200, description="Количество записей на странице"),
        search: Optional[str] = Query(None, description="""Поиск по нескольким полям"""),
        is_active: Optional[bool] = Query(None, description="Фильтр по активности (true/false)"),
        is_superuser: Optional[bool] = Query(None, description="Фильтр по правам суперпользователя (true/false)"),
        role: Optional[str] = Query(None, description="Фильтр по роли (Администратор БД, Аналитик, Разработчик, Тестировщик, Пользователь)"),
        sort_by: str = Query("id", description="Поле для сортировки (id, username, email, created_at, last_login)"),
        sort_order: str = Query("asc", description="Порядок сортировки (asc или desc)")
):
    """Получить список пользователей с поддержкой поиска, фильтрации и сортировки."""
    try:
        query = select(User)
        filters = []
        if search and search.strip():
            search_term = f"%{search.strip()}%"
            filters.append(or_(User.username.ilike(search_term), User.email.ilike(search_term), User.fio.ilike(search_term), ))
        if is_active is not None:
            filters.append(User.is_active == is_active)
        if is_superuser is not None:
            filters.append(User.is_superuser == is_superuser)
        if role:
            filters.append(User.role == role)
        if filters:
            query = query.where(and_(*filters))
        count_query = select(func.count(User.id)).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar_one()
        valid_sort_fields = ["id", "username", "email", "created_at", "last_login", "role", "fio"]
        valid_sort_orders = ["asc", "desc"]
        if sort_by not in valid_sort_fields:
            sort_by = "id"
        sort_order = sort_order.lower()
        if sort_order not in valid_sort_orders:
            sort_order = "asc"
        sort_column = getattr(User, sort_by, User.id)
        if sort_order == "desc":
            query = query.order_by(sort_column.desc())
        else:
            query = query.order_by(sort_column.asc())
        skip = (page - 1) * size
        query = query.offset(skip).limit(size)
        result = await db.execute(query)
        users = result.scalars().all()
        pages = (total + size - 1) // size if size > 0 else 1
        has_next = page < pages
        has_prev = page > 1
        return PaginatedResponse(items=users, total=total, page=page, size=size, pages=pages, has_next=has_next, has_prev=has_prev)
    except Exception as e:
        print(f"❌ Ошибка при получении пользователей: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при получении пользователей: {str(e)}")


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    """Создать нового пользователя"""
    user_service = UserService(db)
    try:
        user = await user_service.create_user(user_data)
        return user
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        print(f"❌ Ошибка при создании пользователя: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при создании пользователя: {str(e)}")


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    """Получить пользователя по ID"""
    user_service = UserService(db)
    try:
        user = await user_service.get_user(user_id)
    except Exception as e:
        print(f"❌ Ошибка при получении пользователя: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при получении пользователя: {str(e)}")
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")
    return user


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(user_id: int, user_data: UserUpdate, db: AsyncSession = Depends(get_db)):
    """Обновить пользователя по ID"""
    user_service = UserService(db)
    try:
        user = await user_service.update_user(user_id, user_data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        print(f"❌ Ошибка при обновлении пользователя: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при обновлении пользователя: {str(e)}")
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: int, db: AsyncSession = Depends(get_db)):
    """Удалить пользователя по ID"""
    user_service = UserService(db)
    try:
        success = await user_service.delete_user(user_id)
    except Exception as e:
        print(f"❌ Ошибка при удалении пользователя: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при удалении пользователя: {str(e)}")
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")
