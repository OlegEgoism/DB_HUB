# backend/api/v1/db_tables.py

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.session import get_db
from backend.schemas.db_tables_schemas import (
    PaginatedSchemasWithTablesResponse,
    PaginatedTablePrivilegesGroupsResponse,
    PaginatedTablePrivilegesUsersResponse,
    PaginatedTemporaryTablesResponse,
    TablePrivilegesGroupsUpdateRequest,
    TablePrivilegesGroupsUpdateResponse,
    TablePrivilegesUpdateRequest,
    TablePrivilegesUpdateResponse,
)
from backend.services.db_tables_services import DBTablesService

router = APIRouter(prefix="/db_connections/{connection_id}/tables", tags=["DB TABLES"])


@router.get("", response_model=PaginatedSchemasWithTablesResponse, summary="Получить список таблиц", description="Возвращает пагинированный список схем с таблицами")
async def get_tables(
    connection_id: int,
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1, description="Номер страницы, начиная с 1"),
    size: int = Query(20, ge=1, le=200, description="Количество записей на странице (1–200)"),
    search: str = Query(None, description="Поиск по имени/описанию схемы, имени/описанию таблицы"),
):
    """Получить список таблиц"""
    try:
        service = DBTablesService(db)
        result = await service.get_tables(connection_id=connection_id, page=page, size=size, search=search)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при получении схем и таблиц: {str(e)}",
        ) from e


@router.get(
    "/temporary",
    response_model=PaginatedTemporaryTablesResponse,
    summary="Получить список временных таблиц",
    description="Возвращает пагинированный список временных таблиц",
)
async def get_tables_temporary(
    connection_id: int,
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1, description="Номер страницы, начиная с 1"),
    size: int = Query(20, ge=1, le=200, description="Количество записей на странице (1–200)"),
    search: str = Query(
        None,
        description="Поиск по имени/описанию схемы, имени/описанию временной таблицы",
    ),
):
    """Получить список временных таблиц"""
    try:
        service = DBTablesService(db)
        result = await service.get_tables_temporary(connection_id=connection_id, page=page, size=size, search=search)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при получении временных таблиц: {str(e)}",
        ) from e


@router.get(
    "/privileges_users",
    response_model=PaginatedTablePrivilegesUsersResponse,
    summary="Получить права пользователя к таблицам",
    description="Возвращает пагинированный список прав пользователей к таблицам",
)
async def get_tables_privileges_for_users(
    connection_id: int,
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1, description="Номер страницы, начиная с 1"),
    size: int = Query(20, ge=1, le=200, description="Количество записей на странице (1–200)"),
    search: str = Query(
        None,
        description="Поиск по имени/описанию схемы, имени/описанию таблицы и имени пользователя",
    ),
):
    """Получить права пользователя к таблицам"""
    try:
        service = DBTablesService(db)
        result = await service.get_tables_privileges_for_users(connection_id=connection_id, page=page, size=size, search=search)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при получении привилегий таблиц: {str(e)}") from e


@router.post(
    "/privileges_users",
    response_model=TablePrivilegesUpdateResponse,
    summary="Обновить права пользователя на таблицу",
    description="Обновляет права пользователя на указанную таблицу",
)
async def update_tables_privileges_for_users(
    connection_id: int,
    request: TablePrivilegesUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Обновить права пользователя на таблицу"""
    try:
        service = DBTablesService(db)
        updated = await service.update_tables_privileges_for_users(
            connection_id=connection_id,
            schema_name=request.schema_name,
            table_name=request.table_name,
            user_privileges=[
                {
                    "username": u.username,
                    "select": u.select,
                    "insert": u.insert,
                    "update": u.update,
                    "delete": u.delete,
                    "truncate": u.truncate,
                }
                for u in request.users
            ],
        )
        return TablePrivilegesUpdateResponse(message="Права на таблицу успешно обновлены", updated_users=updated)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при обновлении прав: {str(e)}") from e


@router.get(
    "/privileges_groups",
    response_model=PaginatedTablePrivilegesGroupsResponse,
    summary="Получить права групп к таблицам",
    description="Возвращает пагинированный список прав групп к таблицам",
)
async def get_tables_privileges_for_groups(
    connection_id: int,
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1, description="Номер страницы, начиная с 1"),
    size: int = Query(20, ge=1, le=200, description="Количество записей на странице (1–200)"),
    table_kind: Literal["regular", "temporary", "all"] = Query(
        "regular",
        description="Тип таблиц: regular (обычные), temporary (временные), all (все)",
    ),
    search: str = Query(
        None,
        description="Поиск по имени/описанию схемы, имени/описанию таблицы и имени группы",
    ),
):
    """Получить права групп к таблицам"""
    try:
        service = DBTablesService(db)
        result = await service.get_tables_privileges_for_groups(
            connection_id=connection_id,
            page=page,
            size=size,
            search=search,
            table_kind=table_kind,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при получении привилегий групп: {str(e)}") from e


@router.post(
    "/privileges_groups",
    response_model=TablePrivilegesGroupsUpdateResponse,
    summary="Обновить права группы на таблицу",
    description="Обновляет права группы на указанную таблицу",
)
async def update_tables_privileges_for_groups(
    connection_id: int,
    request: TablePrivilegesGroupsUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Обновить права группы на таблицу"""
    try:
        service = DBTablesService(db)
        updated = await service.update_tables_privileges_for_groups(
            connection_id=connection_id,
            schema_name=request.schema_name,
            table_name=request.table_name,
            group_privileges=[
                {
                    "groupname": g.groupname,
                    "select": g.select,
                    "insert": g.insert,
                    "update": g.update,
                    "delete": g.delete,
                    "truncate": g.truncate,
                }
                for g in request.groups
            ],
        )
        return TablePrivilegesGroupsUpdateResponse(message="Права групп на таблицу успешно обновлены", updated_groups=updated)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при обновлении прав групп: {str(e)}") from e
