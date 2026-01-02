# backend/api/v1/db_schemas.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from backend.database.session import get_db
from backend.services.db_schema_service import DBSchemaService
from backend.schemas.db_schema_schemas import (
    PaginatedDBSchemasResponse,
    DBSchemaUpdateRequest,
    DBSchemaUpdateResponse,
    DBSchemaCreateRequest,
    DBSchemaCreateResponse,
    DBSchemaDeleteRequest,
    DBSchemaDeleteResponse
)

router = APIRouter(prefix="/db_schemas", tags=["DB SCHEMAS"])


@router.get("/connection/{connection_id}", response_model=PaginatedDBSchemasResponse)
async def get_schema_statistics(
        connection_id: int,
        db: AsyncSession = Depends(get_db),
        search: Optional[str] = Query(None, description="Поиск по имени схемы, владельцу или описанию"),
        page: int = Query(1, ge=1, description="Номер страницы, начиная с 1"),
        size: int = Query(20, ge=1, le=200, description="Количество записей на странице (1–200)"),
        sort_by: str = Query("name", description="Поле для сортировки (name, owner, size_bytes, table_count)"),
        sort_order: str = Query("asc", description="Порядок сортировки (asc или desc)")
):
    """Получить статистику по схемам из внешней БД."""
    try:
        service = DBSchemaService(db)
        result = await service.get_schemas_with_statistics(
            connection_id=connection_id,
            search=search,
            page=page,
            size=size,
            sort_by=sort_by,
            sort_order=sort_order
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при получении статистики по схемам: {str(e)}")



@router.post("/connection/{connection_id}", response_model=DBSchemaCreateResponse)
async def create_schema(
        connection_id: int,
        create_data: DBSchemaCreateRequest,
        db: AsyncSession = Depends(get_db)
):
    """Создать новую схему во внешней БД."""
    try:
        service = DBSchemaService(db)
        result = await service.create_schema(
            connection_id=connection_id,
            name=create_data.name,
            owner=create_data.owner,
            description=create_data.description
        )
        return DBSchemaCreateResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при создании схемы: {str(e)}")


@router.delete("/connection/{connection_id}", response_model=DBSchemaDeleteResponse)
async def delete_schema(
        connection_id: int,
        delete_data: DBSchemaDeleteRequest,
        db: AsyncSession = Depends(get_db)
):
    """Удалить схему из внешней БД."""
    try:
        service = DBSchemaService(db)
        result = await service.delete_schema(
            connection_id=connection_id,
            schema_name=delete_data.schema_name,
            cascade=delete_data.cascade
        )
        return DBSchemaDeleteResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при удалении схемы: {str(e)}")


@router.patch("/connection/{connection_id}/schema/{schema_oid}", response_model=DBSchemaUpdateResponse)
async def update_schema(
        connection_id: int,
        schema_oid: int,
        update_data: DBSchemaUpdateRequest,
        db: AsyncSession = Depends(get_db)
):
    """Обновить схему во внешней БД."""
    try:
        service = DBSchemaService(db)
        if update_data.name is None and update_data.description is None:
            raise ValueError("Не указаны поля для обновления. Укажите name и/или description")
        result = await service.update_schema(
            connection_id=connection_id,
            schema_oid=schema_oid,
            name=update_data.name,
            description=update_data.description
        )
        return DBSchemaUpdateResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при обновлении схемы: {str(e)}")