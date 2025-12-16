# backend/api/v1/users.py
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from backend.database.session import get_db
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


@router.get("/all", response_model=List[UserResponse])
async def list_users_no_pagination(db: AsyncSession = Depends(get_db)):
    """Получить всех пользователей без пагинации"""
    user_service = UserService(db)
    try:
        users = await user_service.get_all_users(skip=0, limit=1000)
        return users
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
