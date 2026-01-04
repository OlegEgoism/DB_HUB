# backend/api/v1/db_schemas.py
import math
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from backend.database.session import get_db
from backend.services.db_schema_service import DBSchemaService
from backend.schemas.db_schema_schemas import (
    PaginatedSchemasWithTablesResponse,
    PaginatedTemporaryTablesResponse,
    PaginatedViewsResponse,
    PaginatedMaterializedViewsResponse,
    PaginatedFunctionsResponse,
    PaginatedIndexesResponse,
    SchemaPrivilegesResponse,
    SchemaPrivilegesUpdateResponse,
    SchemaPrivilegesUpdateRequest,
    SchemaPrivilegesGroupsUpdateResponse,
    SchemaPrivilegesGroupsUpdateRequest,
    TablePrivilegesLimitedResponse, PaginatedSchemaPrivilegesResponse, PaginatedSchemaPrivilegesGroupsResponse, PaginatedSchemaPrivilegesUsersResponse, TablePrivilegesUpdateResponse, TablePrivilegesUpdateRequest
)

router = APIRouter(prefix="/db_schemas", tags=["DB SCHEMAS"])


@router.get("/connection/{connection_id}/tables", response_model=PaginatedSchemasWithTablesResponse)
async def get_schemas_with_physical_tables(
        connection_id: int,
        db: AsyncSession = Depends(get_db),
        page: int = Query(1, ge=1, description="Номер страницы"),
        size: int = Query(20, ge=1, le=200, description="Количество схем на странице"),
        search: str = Query(None, description="Поиск по: имени/описанию схемы, имени/описанию таблицы"),
):
    """Получить список схем и физических таблиц."""
    try:
        service = DBSchemaService(db)
        result = await service.get_schemas_with_tables(connection_id=connection_id, page=page, size=size, search=search)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при получении схем и таблиц: {str(e)}")


@router.get("/connection/{connection_id}/temporary_tables", response_model=PaginatedTemporaryTablesResponse)
async def get_temporary_tables(
        connection_id: int,
        db: AsyncSession = Depends(get_db),
        page: int = Query(1, ge=1, description="Номер страницы"),
        size: int = Query(20, ge=1, le=200, description="Количество таблиц на странице"),
        search: str = Query(None, description="Поиск по имени/описанию временной таблицы"),
):
    """Получить список временных таблиц в текущей сессии подключения."""
    try:
        service = DBSchemaService(db)
        result = await service.get_temporary_tables(connection_id=connection_id, page=page, size=size, search=search)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при получении временных таблиц: {str(e)}")


@router.get("/connection/{connection_id}/views", response_model=PaginatedViewsResponse)
async def get_views(
        connection_id: int,
        db: AsyncSession = Depends(get_db),
        page: int = Query(1, ge=1, description="Номер страницы"),
        size: int = Query(20, ge=1, le=200, description="Количество представлений на странице"),
        search: str = Query(None, description="Поиск по имени/описанию представления"),
):
    """Получить список представлений (views)."""
    try:
        service = DBSchemaService(db)
        result = await service.get_views(connection_id=connection_id, page=page, size=size, search=search)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при получении представлений: {str(e)}")


@router.get("/connection/{connection_id}/materialized_views", response_model=PaginatedMaterializedViewsResponse)
async def get_materialized_views(
        connection_id: int,
        db: AsyncSession = Depends(get_db),
        page: int = Query(1, ge=1, description="Номер страницы"),
        size: int = Query(20, ge=1, le=200, description="Количество материализованных представлений на странице"),
        search: str = Query(None, description="Поиск по имени/схеме/описанию материализованного представления"),
):
    """Получить список материализованных представлений (materialized views)."""
    try:
        service = DBSchemaService(db)
        result = await service.get_materialized_views(connection_id=connection_id, page=page, size=size, search=search)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при получении материализованных представлений: {str(e)}")


@router.get("/connection/{connection_id}/functions", response_model=PaginatedFunctionsResponse)
async def get_functions(
        connection_id: int,
        db: AsyncSession = Depends(get_db),
        page: int = Query(1, ge=1, description="Номер страницы"),
        size: int = Query(20, ge=1, le=200, description="Количество функций на странице"),
        search: str = Query(None, description="Поиск по имени/схеме/описанию функции"),
):
    """Получить список функций."""
    try:
        service = DBSchemaService(db)
        result = await service.get_functions(connection_id=connection_id, page=page, size=size, search=search)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при получении функций: {str(e)}")


@router.get("/connection/{connection_id}/indexes", response_model=PaginatedIndexesResponse)
async def get_indexes(
        connection_id: int,
        db: AsyncSession = Depends(get_db),
        page: int = Query(1, ge=1, description="Номер страницы"),
        size: int = Query(20, ge=1, le=200, description="Количество индексов на странице"),
        search: str = Query(None, description="Поиск по имени индекса, имени таблицы, схеме или описанию"),
):
    """Получить список индексов."""
    try:
        service = DBSchemaService(db)
        result = await service.get_indexes(connection_id=connection_id, page=page, size=size, search=search)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при получении индексов: {str(e)}")


@router.get("/connection/{connection_id}/schema_privileges_users", response_model=PaginatedSchemaPrivilegesUsersResponse)
async def get_schema_privileges_for_users(
        connection_id: int,
        db: AsyncSession = Depends(get_db),
        page: int = Query(1, ge=1, description="Номер страницы"),
        size: int = Query(20, ge=1, le=200, description="Количество записей на странице"),
        search: str = Query(None, description="Поиск по schema_name, description, owner или имени роли (role)"),
):
    try:
        service = DBSchemaService(db)
        result = await service.get_schema_privileges_for_users(connection_id=connection_id, page=page, size=size, search=search)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при получении привилегий схем: {str(e)}")


@router.post("/connection/{connection_id}/schema_privileges_users", response_model=SchemaPrivilegesUpdateResponse, status_code=status.HTTP_200_OK)
async def update_schema_privileges_for_users(connection_id: int, request: SchemaPrivilegesUpdateRequest, db: AsyncSession = Depends(get_db), ):
    """Обновить права CREATE и USAGE на схему для указанных пользователей"""
    try:
        service = DBSchemaService(db)
        updated = await service.update_schema_privileges_for_users(
            connection_id=connection_id,
            schema_name=request.schema_name,
            user_privileges=[{"username": u.username, "create": u.create, "usage": u.usage} for u in request.users],
        )
        return SchemaPrivilegesUpdateResponse(message="Права успешно обновлены", updated_users=updated)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при обновлении прав: {str(e)}")


@router.get("/connection/{connection_id}/schema_privileges_groups", response_model=PaginatedSchemaPrivilegesGroupsResponse)
async def get_schema_privileges_for_groups(
        connection_id: int,
        db: AsyncSession = Depends(get_db),
        page: int = Query(1, ge=1, description="Номер страницы"),
        size: int = Query(20, ge=1, le=200, description="Количество записей на странице"),
        search: str = Query(None, description="Поиск по schema_name, description, owner или имени группы (role)"),
):
    try:
        service = DBSchemaService(db)
        result = await service.get_schema_privileges_for_groups(connection_id=connection_id, page=page, size=size, search=search)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при получении привилегий групп: {str(e)}")


@router.post("/connection/{connection_id}/schema_privileges_groups", response_model=SchemaPrivilegesGroupsUpdateResponse, status_code=status.HTTP_200_OK)
async def update_schema_privileges_for_groups(connection_id: int, request: SchemaPrivilegesGroupsUpdateRequest, db: AsyncSession = Depends(get_db), ):
    """Обновить права CREATE и USAGE на схему для указанных групп"""
    try:
        service = DBSchemaService(db)
        updated = await service.update_schema_privileges_for_groups(
            connection_id=connection_id,
            schema_name=request.schema_name,
            group_privileges=[{"groupname": g.groupname, "create": g.create, "usage": g.usage} for g in request.groups],
        )
        return SchemaPrivilegesGroupsUpdateResponse(message="Права для групп успешно обновлены", updated_groups=updated)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при обновлении прав для групп: {str(e)}")


from backend.schemas.db_schema_schemas import PaginatedTablePrivilegesUsersResponse


@router.get("/connection/{connection_id}/table_privileges_users", response_model=PaginatedTablePrivilegesUsersResponse)
async def get_table_privileges_for_users(
        connection_id: int,
        db: AsyncSession = Depends(get_db),
        page: int = Query(1, ge=1, description="Номер страницы"),
        size: int = Query(20, ge=1, le=200, description="Количество записей на странице"),
        search: str = Query(None, description="Поиск по schema_name, table_name, owner или имени пользователя (user)"),
):
    """Получить права доступа пользователей к таблицам с поддержкой поиска и пагинации."""
    try:
        service = DBSchemaService(db)
        result = await service.get_table_privileges_for_users(connection_id=connection_id, page=page, size=size, search=search)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при получении привилегий таблиц: {str(e)}")


@router.post("/connection/{connection_id}/table_privileges_users", response_model=TablePrivilegesUpdateResponse)
async def update_table_privileges_for_users(connection_id: int, request: TablePrivilegesUpdateRequest, db: AsyncSession = Depends(get_db), ):
    """Обновить права SELECT/INSERT/UPDATE/DELETE/TRUNCATE на таблицу для указанных пользователей"""
    try:
        service = DBSchemaService(db)
        updated = await service.update_table_privileges_for_users(
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


from backend.schemas.db_schema_schemas import (
    PaginatedTablePrivilegesGroupsResponse,
    TablePrivilegesGroupsUpdateRequest,
    TablePrivilegesGroupsUpdateResponse
)

@router.get("/connection/{connection_id}/table_privileges_groups", response_model=PaginatedTablePrivilegesGroupsResponse)
async def get_table_privileges_for_groups(
    connection_id: int,
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1, description="Номер страницы"),
    size: int = Query(20, ge=1, le=200, description="Количество записей на странице"),
    search: str = Query(None, description="Поиск по schema_name, table_name, owner или имени группы (group)"),
):
    """Получить права доступа групп к таблицам с поддержкой поиска и пагинации."""
    try:
        service = DBSchemaService(db)
        result = await service.get_table_privileges_for_groups(connection_id=connection_id, page=page, size=size, search=search)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при получении привилегий групп: {str(e)}")


@router.post("/connection/{connection_id}/table_privileges_groups", response_model=TablePrivilegesGroupsUpdateResponse)
async def update_table_privileges_for_groups(
    connection_id: int,
    request: TablePrivilegesGroupsUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Обновить права SELECT/INSERT/UPDATE/DELETE/TRUNCATE на таблицу для указанных групп"""
    try:
        service = DBSchemaService(db)
        updated = await service.update_table_privileges_for_groups(
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