# backend/api/v1/db_schemas.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from backend.database.session import get_db
from backend.services.db_schemas_services import DBSchemaService
from backend.schemas.db_schemas_schemas import (
    SchemaPrivilegesUpdateResponse,
    SchemaPrivilegesUpdateRequest,
    SchemaPrivilegesGroupsUpdateResponse,
    SchemaPrivilegesGroupsUpdateRequest,
    PaginatedSchemaPrivilegesGroupsResponse,
    PaginatedSchemaPrivilegesUsersResponse,
)

router = APIRouter(prefix="/db_connections/{connection_id}/schemas", tags=["DB SCHEMAS"])


@router.get("/privileges_users", response_model=PaginatedSchemaPrivilegesUsersResponse)
async def get_schema_privileges_for_users(
    connection_id: int,
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1, description="Номер страницы, начиная с 1"),
    size: int = Query(20, ge=1, le=200, description="Количество записей на странице (1–200)"),
    search: str = Query(None, description="Поиск по схеме названию/описанию и имени пользователя"),
):
    """Получить права пользователей в схеме"""
    try:
        service = DBSchemaService(db)
        result = await service.get_schema_privileges_for_users(
            connection_id=connection_id, page=page, size=size, search=search
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при получении привилегий схем: {str(e)}")


@router.post(
    "/privileges_users",
    response_model=SchemaPrivilegesUpdateResponse,
    status_code=status.HTTP_200_OK,
)
async def update_schema_privileges_for_users(
    connection_id: int,
    request: SchemaPrivilegesUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Обновить права пользователя в схеме"""
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


@router.get("/privileges_groups", response_model=PaginatedSchemaPrivilegesGroupsResponse)
async def get_schema_privileges_for_groups(
    connection_id: int,
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1, description="Номер страницы, начиная с 1"),
    size: int = Query(20, ge=1, le=200, description="Количество записей на странице (1–200)"),
    search: str = Query(None, description="Поиск по схеме названию/описанию и имени группы"),
):
    """Получить права группы в схеме"""
    try:
        service = DBSchemaService(db)
        result = await service.get_schema_privileges_for_groups(
            connection_id=connection_id, page=page, size=size, search=search
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при получении привилегий групп: {str(e)}")


@router.post(
    "/privileges_groups",
    response_model=SchemaPrivilegesGroupsUpdateResponse,
    status_code=status.HTTP_200_OK,
)
async def update_schema_privileges_for_groups(
    connection_id: int,
    request: SchemaPrivilegesGroupsUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Обновить права группы к схеме"""
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
