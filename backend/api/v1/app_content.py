# backend/api/v1/app_content.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.session import get_db
from backend.schemas.app_content_schemas import (
    AppContentCreate,
    AppContentResponse,
    AppContentUpdate,
    PaginatedAppContentResponse,
)
from backend.services.app_content_services import AppContentService

router = APIRouter(prefix="/app_content", tags=["APP CONTENT"])


@router.get("", response_model=PaginatedAppContentResponse)
async def list_content(
    db: AsyncSession = Depends(get_db),
    content_type: str | None = Query(None, description="Тип контента: agreement или documentation"),
    is_active: bool | None = Query(None, description="Фильтр по активности"),
    page: int = Query(1, ge=1, description="Номер страницы"),
    size: int = Query(20, ge=1, le=200, description="Размер страницы"),
    search: str | None = Query(None, description="Поиск по номеру, заголовку или содержанию"),
):
    """Получить список контента"""
    try:
        service = AppContentService(db)
        result = await service.list_content(content_type=content_type, is_active=is_active, page=page, size=size, search=search)
        return result
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при получении списка контента: {str(e)}") from e


@router.get("/agreements", response_model=PaginatedAppContentResponse)
async def list_agreements(
    db: AsyncSession = Depends(get_db),
    is_active: bool | None = Query(None, description="Фильтр по активности"),
    page: int = Query(1, ge=1, description="Номер страницы"),
    size: int = Query(20, ge=1, le=200, description="Размер страницы"),
    search: str | None = Query(None, description="Поиск по номеру, заголовку или содержанию"),
):
    """Получить список соглашений"""
    try:
        service = AppContentService(db)
        result = await service.list_agreements(is_active=is_active, page=page, size=size, search=search)
        return result
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при получении списка соглашений: {str(e)}") from e


@router.get("/documentations", response_model=PaginatedAppContentResponse)
async def list_documentations(
    db: AsyncSession = Depends(get_db),
    is_active: bool | None = Query(None, description="Фильтр по активности"),
    page: int = Query(1, ge=1, description="Номер страницы"),
    size: int = Query(20, ge=1, le=200, description="Размер страницы"),
    search: str | None = Query(None, description="Поиск по номеру, заголовку или содержанию"),
):
    """Получить список документаций"""
    try:
        service = AppContentService(db)
        result = await service.list_documentations(is_active=is_active, page=page, size=size, search=search)
        return result
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при получении списка документаций: {str(e)}") from e


@router.get("/{content_id}", response_model=AppContentResponse)
async def get_content(content_id: int, db: AsyncSession = Depends(get_db)):
    """Получить контент по ID"""
    try:
        service = AppContentService(db)
        content = await service.get_content(content_id)
        if not content:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Контент с ID {content_id} не найден")
        return content
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при получении контента: {str(e)}") from e


@router.post("", response_model=AppContentResponse, status_code=status.HTTP_201_CREATED)
async def create_content(content_data: AppContentCreate, db: AsyncSession = Depends(get_db)):
    """Создать контент"""
    try:
        service = AppContentService(db)
        content = await service.create_content(content_data)
        return content
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при создании контента: {str(e)}") from e


@router.put("/{content_id}", response_model=AppContentResponse)
async def update_content(content_id: int, content_data: AppContentUpdate, db: AsyncSession = Depends(get_db)):
    """Обновить контент"""
    try:
        service = AppContentService(db)
        content = await service.update_content(content_id, content_data)
        if not content:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Контент с ID {content_id} не найден")
        return content
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при обновлении контента: {str(e)}") from e


@router.delete("/{content_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_content(content_id: int, db: AsyncSession = Depends(get_db)):
    """Удалить контент"""
    try:
        service = AppContentService(db)
        success = await service.delete_content(content_id)
        if not success:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Контент с ID {content_id} не найден")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при удалении контента: {str(e)}") from e


# @router.patch("/{content_id}/toggle-active", response_model=AppContentResponse)
# async def toggle_active(content_id: int, db: AsyncSession = Depends(get_db)):
#     """Переключить статус активности"""
#     try:
#         service = AppContentService(db)
#         content = await service.toggle_active(content_id)
#         if not content:
#             raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Контент с ID {content_id} не найден")
#         return content
#     except Exception as e:
#         raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при переключении статуса: {str(e)}") from e
