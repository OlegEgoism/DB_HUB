# backend/api/v1/db_views.py

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.session import get_db
from backend.schemas.db_views_schemas import (
    PaginatedMaterializedViewPrivilegesGroupsResponse,
    PaginatedMaterializedViewsResponse,
    PaginatedViewPrivilegesGroupsResponse,
    PaginatedViewsResponse,
    ViewPrivilegesGroupsUpdateRequest,
    ViewPrivilegesGroupsUpdateResponse,
)
from backend.services.db_views_services import DBViewsService

router = APIRouter(prefix="/db_connections/{connection_id}/views", tags=["DB VIEWS"])


@router.get(
    "",
    response_model=PaginatedViewsResponse,
    summary="Получить список представлений",
    description="Возвращает пагинированный список представлений в базе данных",
)
async def get_views(
    connection_id: int,
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1, description="Номер страницы, начиная с 1"),
    size: int = Query(20, ge=1, le=200, description="Количество записей на странице (1–200)"),
    search: str = Query(None, description="Поиск по схеме, названию/описанию представления"),
):
    """Получить список представлений"""
    try:
        service = DBViewsService(db)
        result = await service.get_views(connection_id=connection_id, page=page, size=size, search=search)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при получении представлений: {str(e)}",
        ) from e


@router.get(
    "/materialized",
    response_model=PaginatedMaterializedViewsResponse,
    summary="Получить список материализованных представлений",
    description="Возвращает пагинированный список материализованных представлений в базе данных",
)
async def get_materialized_views(
    connection_id: int,
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1, description="Номер страницы, начиная с 1"),
    size: int = Query(20, ge=1, le=200, description="Количество записей на странице (1–200)"),
    search: str = Query(
        None,
        description="Поиск по схеме, названию/описанию материализованного представления",
    ),
):
    """Получить список материализованных представлений"""
    try:
        service = DBViewsService(db)
        result = await service.get_materialized_views(connection_id=connection_id, page=page, size=size, search=search)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при получении материализованных представлений: {str(e)}",
        ) from e


@router.get(
    "/privileges_groups",
    response_model=PaginatedViewPrivilegesGroupsResponse,
    summary="Получить права групп к представлениям",
    description="Возвращает пагинированный список прав групп к представлениям",
)
async def get_views_privileges_for_groups(
    connection_id: int,
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1, description="Номер страницы, начиная с 1"),
    size: int = Query(20, ge=1, le=200, description="Количество записей на странице (1–200)"),
    search: str = Query(None, description="Поиск по схеме, представлению, описанию и имени группы"),
):
    """Получить права групп к представлениям"""
    try:
        service = DBViewsService(db)
        result = await service.get_views_privileges_for_groups(
            connection_id=connection_id,
            page=page,
            size=size,
            search=search,
            view_kind="view",
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при получении привилегий групп: {str(e)}") from e


@router.post(
    "/privileges_groups",
    response_model=ViewPrivilegesGroupsUpdateResponse,
    summary="Обновить права групп на представление",
    description="Обновляет права групп CREATE и USAGE на указанное представление",
)
async def update_views_privileges_for_groups(
    connection_id: int,
    request: ViewPrivilegesGroupsUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Обновить права групп на представление"""
    try:
        service = DBViewsService(db)
        updated = await service.update_view_privileges_for_groups(
            connection_id=connection_id,
            schema_name=request.schema_name,
            view_name=request.view_name,
            group_privileges=[
                {
                    "groupname": g.groupname,
                    "create": g.create,
                    "usage": g.usage,
                }
                for g in request.groups
            ],
            view_kind="view",
        )
        return ViewPrivilegesGroupsUpdateResponse(message="Права групп на представление успешно обновлены", updated_groups=updated)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при обновлении прав групп: {str(e)}") from e


@router.get(
    "/materialized/privileges_groups",
    response_model=PaginatedMaterializedViewPrivilegesGroupsResponse,
    summary="Получить права групп к материализованным представлениям",
    description="Возвращает пагинированный список прав групп к материализованным представлениям",
)
async def get_materialized_views_privileges_for_groups(
    connection_id: int,
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1, description="Номер страницы, начиная с 1"),
    size: int = Query(20, ge=1, le=200, description="Количество записей на странице (1–200)"),
    search: str = Query(None, description="Поиск по схеме, представлению, описанию и имени группы"),
):
    """Получить права групп к материализованным представлениям"""
    try:
        service = DBViewsService(db)
        result = await service.get_views_privileges_for_groups(
            connection_id=connection_id,
            page=page,
            size=size,
            search=search,
            view_kind="materialized",
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при получении привилегий групп: {str(e)}") from e


@router.post(
    "/materialized/privileges_groups",
    response_model=ViewPrivilegesGroupsUpdateResponse,
    summary="Обновить права групп на материализованное представление",
    description="Обновляет права групп CREATE и USAGE на указанное материализованное представление",
)
async def update_materialized_views_privileges_for_groups(
    connection_id: int,
    request: ViewPrivilegesGroupsUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Обновить права групп на материализованное представление"""
    try:
        service = DBViewsService(db)
        updated = await service.update_view_privileges_for_groups(
            connection_id=connection_id,
            schema_name=request.schema_name,
            view_name=request.view_name,
            group_privileges=[
                {
                    "groupname": g.groupname,
                    "create": g.create,
                    "usage": g.usage,
                }
                for g in request.groups
            ],
            view_kind="materialized",
        )
        return ViewPrivilegesGroupsUpdateResponse(message="Права групп на материализованное представление успешно обновлены", updated_groups=updated)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при обновлении прав групп: {str(e)}") from e
