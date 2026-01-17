# backend/api/v1/db_tables.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from backend.database.session import get_db
from backend.services.db_tables_services import DBTablesService
from backend.schemas.db_tables_schemas import (
    PaginatedSchemasWithTablesResponse,
    PaginatedTemporaryTablesResponse,
    TablePrivilegesUpdateResponse,
    TablePrivilegesUpdateRequest,
    TablePrivilegesGroupsUpdateResponse,
    PaginatedTablePrivilegesGroupsResponse,
    TablePrivilegesGroupsUpdateRequest,
    PaginatedTablePrivilegesUsersResponse
)

router = APIRouter(prefix="/db_connections/{connection_id}/tables", tags=["DB TABLES"])


@router.get("", response_model=PaginatedSchemasWithTablesResponse)
async def get_tables(
        connection_id: int,
        db: AsyncSession = Depends(get_db),
        page: int = Query(1, ge=1, description="Номер страницы"),
        size: int = Query(20, ge=1, le=200, description="Количество схем на странице"),
        search: str = Query(None, description="Поиск по: имени/описанию схемы, имени/описанию таблицы"),
):
    """Получить список таблиц"""
    try:
        service = DBTablesService(db)
        result = await service.get_tables(connection_id=connection_id, page=page, size=size, search=search)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при получении схем и таблиц: {str(e)}")


@router.get("/temporary", response_model=PaginatedTemporaryTablesResponse)
async def get_tables_temporary(
        connection_id: int,
        db: AsyncSession = Depends(get_db),
        page: int = Query(1, ge=1, description="Номер страницы"),
        size: int = Query(20, ge=1, le=200, description="Количество таблиц на странице"),
        search: str = Query(None, description="Поиск по имени/описанию временной таблицы"),
):
    """Получить список временных таблиц"""
    try:
        service = DBTablesService(db)
        result = await service.get_tables_temporary(connection_id=connection_id, page=page, size=size, search=search)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при получении временных таблиц: {str(e)}")


@router.get("/privileges_users", response_model=PaginatedTablePrivilegesUsersResponse)
async def get_tables_privileges_for_users(
        connection_id: int,
        db: AsyncSession = Depends(get_db),
        page: int = Query(1, ge=1, description="Номер страницы"),
        size: int = Query(20, ge=1, le=200, description="Количество записей на странице"),
        search: str = Query(None, description="Поиск по schema_name, table_name, owner или имени пользователя (user)"),
):
    """Получить права пользователя к таблицам"""
    try:
        service = DBTablesService(db)
        result = await service.get_tables_privileges_for_users(connection_id=connection_id, page=page, size=size, search=search)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при получении привилегий таблиц: {str(e)}")


@router.post("/privileges_users", response_model=TablePrivilegesUpdateResponse)
async def update_tables_privileges_for_users(connection_id: int, request: TablePrivilegesUpdateRequest, db: AsyncSession = Depends(get_db), ):
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
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при обновлении прав: {str(e)}")


@router.get("/privileges_groups", response_model=PaginatedTablePrivilegesGroupsResponse)
async def get_tables_privileges_for_groups(
        connection_id: int,
        db: AsyncSession = Depends(get_db),
        page: int = Query(1, ge=1, description="Номер страницы"),
        size: int = Query(20, ge=1, le=200, description="Количество записей на странице"),
        search: str = Query(None, description="Поиск по schema_name, table_name, owner или имени группы (group)"),
):
    """Получить права групп к таблицам"""
    try:
        service = DBTablesService(db)
        result = await service.get_tables_privileges_for_groups(connection_id=connection_id, page=page, size=size, search=search)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при получении привилегий групп: {str(e)}")


@router.post("/privileges_groups", response_model=TablePrivilegesGroupsUpdateResponse)
async def update_tables_privileges_for_groups(connection_id: int, request: TablePrivilegesGroupsUpdateRequest, db: AsyncSession = Depends(get_db), ):
    """Обновить прав группы на таблицу"""
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
        return TablePrivilegesGroupsUpdateResponse(
            message="Права групп на таблицу успешно обновлены",
            updated_groups=updated
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при обновлении прав групп: {str(e)}")
