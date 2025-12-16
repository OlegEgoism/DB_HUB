# backend/api/v1/users.py
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.database.session import get_db
from backend.models.user import User
from backend.schemas.user_schemas import UserResponse, UserCreate, UserUpdate, PaginatedResponse
from backend.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["USERS APP"])


@router.get("/", response_model=PaginatedResponse)
async def list_users(
        db: AsyncSession = Depends(get_db),
        page: int = Query(1, ge=1, description="Номер страницы, начиная с 1"),
        size: int = Query(20, ge=1, le=200, description="Количество записей на странице (1-200)")
):
    user_service = UserService(db)
    try:
        users, total, current_page, page_size, total_pages, has_next, has_prev = await user_service.get_paginated_users(page=page, size=size)
        return PaginatedResponse(
            items=users,
            total=total,
            page=current_page,
            size=page_size,
            pages=total_pages,
            has_next=has_next,
            has_prev=has_prev
        )
    except Exception as e:
        print(f"❌ Ошибка при получении пользователей: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при получении пользователей: {str(e)}")


@router.get("/search/", response_model=PaginatedResponse)
async def search_users(
        username: Optional[str] = Query(None, description="Поиск по username"),
        email: Optional[str] = Query(None, description="Поиск по email"),
        fio: Optional[str] = Query(None, description="Поиск по ФИО"),
        is_active: Optional[bool] = Query(None, description="Фильтр по активности"),
        is_superuser: Optional[bool] = Query(None, description="Фильтр по правам суперпользователя"),
        role: Optional[str] = Query(None, description="Фильтр по роли"),
        db: AsyncSession = Depends(get_db),
        page: int = Query(1, ge=1),
        size: int = Query(20, ge=1, le=200)
):
    """Поиск пользователей с фильтрацией по различным полям"""
    try:
        skip = (page - 1) * size
        query = select(User)
        if username:
            query = query.where(User.username.ilike(f"%{username}%"))
        if email:
            query = query.where(User.email.ilike(f"%{email}%"))
        if fio:
            query = query.where(User.fio.ilike(f"%{fio}%"))
        if is_active is not None:
            query = query.where(User.is_active == is_active)
        if is_superuser is not None:
            query = query.where(User.is_superuser == is_superuser)
        if role:
            query = query.where(User.role == role)
        count_query = select(User.id)
        if username:
            count_query = count_query.where(User.username.ilike(f"%{username}%"))
        if email:
            count_query = count_query.where(User.email.ilike(f"%{email}%"))
        if fio:
            count_query = count_query.where(User.fio.ilike(f"%{fio}%"))
        if is_active is not None:
            count_query = count_query.where(User.is_active == is_active)
        if is_superuser is not None:
            count_query = count_query.where(User.is_superuser == is_superuser)
        if role:
            count_query = count_query.where(User.role == role)
        total_result = await db.execute(select(User.id))
        if any([username, email, fio, is_active is not None, is_superuser is not None, role]):
            total_result = await db.execute(count_query)
        total = len(total_result.scalars().all())
        query = query.order_by(User.id).offset(skip).limit(size)
        result = await db.execute(query)
        users = result.scalars().all()
        pages = (total + size - 1) // size if size > 0 else 1
        has_next = page < pages
        has_prev = page > 1
        return PaginatedResponse(
            items=users,
            total=total,
            page=page,
            size=size,
            pages=pages,
            has_next=has_next,
            has_prev=has_prev
        )
    except Exception as e:
        print(f"❌ Ошибка при поиске пользователей: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при поиске пользователей: {str(e)}")


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
async def get_user_by_id(user_id: int, db: AsyncSession = Depends(get_db)):
    """Получить пользователя по ID"""
    user_service = UserService(db)
    try:
        user = await user_service.get_user_by_id(user_id)
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
