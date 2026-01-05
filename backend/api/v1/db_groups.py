# backend/api/v1/db_groups.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from typing import Optional
from datetime import datetime
import math
from backend.database.session import get_db
from backend.services.db_groups_services import DBGroupService
from backend.schemas.db_groups_schemas import (
    UpdateGroupRequest,
    CreateGroupRequest,
    GroupInfo,
    GroupMembersResponse,
    PaginatedGroupsResponse
)
from backend.models.db import DB_Connection, DB_Group

router = APIRouter(prefix="/db_groups", tags=["DB GROUPS"])


@router.get("/connection/{connection_id}", response_model=PaginatedGroupsResponse)
async def get_groups_auto_sync(
        connection_id: int,
        db: AsyncSession = Depends(get_db),
        page: int = Query(1, ge=1, description="Номер страницы"),
        size: int = Query(20, ge=1, le=200, description="Количество записей на странице"),
        search: Optional[str] = Query(None, description="Поиск по name или description"),
        sort_by: str = Query("name", description="Поле для сортировки (name, created_at, updated_at)"),
        sort_order: str = Query("asc", description="Порядок сортировки (asc или desc)")
):
    """Получить все группы с автоматической синхронизацией из внешней БД с поддержкой пагинации, поиска и сортировки"""
    try:
        group_service = DBGroupService(db)
        check_result = await group_service.check_if_sync_needed(connection_id)
        auto_sync_performed = False
        sync_successful = True
        sync_details = None
        if check_result["needs_sync"]:
            try:
                sync_result = await group_service.smart_sync_groups_for_connection(connection_id)
                auto_sync_performed = True
                sync_details = sync_result
            except Exception as e:
                auto_sync_performed = True
                sync_successful = False
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка автоматической синхронизации: {str(e)}")
        conn_result = await db.execute(select(DB_Connection).where(DB_Connection.id == connection_id))
        connection = conn_result.scalar_one_or_none()
        if not connection:
            raise ValueError(f"Подключение с ID {connection_id} не найдено")
        query = select(DB_Group).where(DB_Group.connection_id == connection_id)
        if search and search.strip():
            search_term = f"%{search.strip()}%"
            filters = []
            filters.append(DB_Group.name.ilike(search_term))
            if search.strip():
                filters.append(DB_Group.description.ilike(search_term))
            query = query.where(or_(*filters))
        count_query = select(func.count(DB_Group.id)).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar_one()
        valid_sort_fields = ["name", "created_at", "updated_at"]
        valid_sort_orders = ["asc", "desc"]
        if sort_by not in valid_sort_fields:
            sort_by = "name"
        sort_order = sort_order.lower()
        if sort_order not in valid_sort_orders:
            sort_order = "asc"
        sort_column = getattr(DB_Group, sort_by, DB_Group.name)
        if sort_order == "desc":
            query = query.order_by(sort_column.desc())
        else:
            query = query.order_by(sort_column.asc())
        skip = (page - 1) * size
        query = query.offset(skip).limit(size)
        result = await db.execute(query)
        groups = result.scalars().all()
        external_groups = await group_service.get_groups_from_database(connection)
        external_by_name = {g["name"]: g["user_count"] for g in external_groups}
        groups_list = []
        for g in groups:
            groups_list.append(GroupInfo(
                id=g.id,
                oid=g.oid,
                name=g.name,
                description=g.description,
                user_count=external_by_name.get(g.name, 0),
                created_at=g.created_at,
                updated_at=g.updated_at
            ))
        pages = math.ceil(total / size) if size > 0 and total > 0 else 1
        has_next = page < pages
        has_prev = page > 1
        return PaginatedGroupsResponse(
            connection_id=connection.id,
            connection_name=connection.name,
            auto_sync_performed=auto_sync_performed,
            sync_successful=sync_successful,
            total=total,
            page=page,
            size=size,
            pages=pages,
            has_next=has_next,
            has_prev=has_prev,
            groups=groups_list,
            sync_statistics=sync_details.get("sync_statistics", {}) if sync_details else None,
            sync_error=None,
            last_sync_time=datetime.now() if auto_sync_performed else None
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,            detail=f"Ошибка при получении групп: {str(e)}"        )


@router.post("/connection/{connection_id}", response_model=GroupInfo)
async def create_group(connection_id: int, group_data: CreateGroupRequest, db: AsyncSession = Depends(get_db)):
    """Создать группу (роль)"""
    try:
        service = DBGroupService(db)
        result = await service.create_group(connection_id=connection_id, name=group_data.name, description=group_data.description)
        return GroupInfo(**result)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при создании группы: {str(e)}")


@router.patch("/{group_id}", response_model=GroupInfo)
async def update_group_with_sync(group_id: int, update_data: UpdateGroupRequest, db: AsyncSession = Depends(get_db)):
    """Обновить группу, поле`description` обновляется локально, поле `name` обновляется во внешней БД (через ALTER ROLE), и локально"""
    try:
        service = DBGroupService(db)
        result = await service.update_group(group_id=group_id, name=update_data.name, description=update_data.description)
        group_result = await db.execute(select(DB_Group).where(DB_Group.id == group_id))
        group = group_result.scalar_one_or_none()
        if not group:
            raise ValueError("Группа не найдена после обновления")
        conn_result = await db.execute(select(DB_Connection).where(DB_Connection.id == group.connection_id))
        connection = conn_result.scalar_one_or_none()
        if not connection:
            raise ValueError("Подключение не найдено")
        external_groups = await service.get_groups_from_database(connection)
        user_count = next((g["user_count"] for g in external_groups if g["name"] == group.name), 0)
        return GroupInfo(
            id=group.id,
            oid=group.oid,
            name=group.name,
            description=group.description,
            user_count=user_count,
            created_at=group.created_at,
            updated_at=group.updated_at
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при обновлении группы: {str(e)}")


@router.delete("/{group_id}", status_code=status.HTTP_200_OK, response_model=dict)
async def delete_group(group_id: int, db: AsyncSession = Depends(get_db)):
    """Удалить группу"""
    try:
        service = DBGroupService(db)
        result = await service.delete_group(group_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при удалении группы: {str(e)}")


@router.get("/group/{group_id}/members", response_model=GroupMembersResponse)
async def get_group_members(group_id: int, db: AsyncSession = Depends(get_db)):
    """Получить список пользователей, входящих в группу (из внешней БД)"""
    try:
        service = DBGroupService(db)
        result = await service.get_group_members_from_external_db(group_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при получении членов группы: {str(e)}")
