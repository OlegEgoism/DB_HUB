# backend/api/v1/db_groups.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from typing import Optional
from datetime import datetime
from backend.database.session import get_db
from backend.services.db_group_service import DBGroupService
from backend.schemas.db_group_schemas import GetGroupsWithSyncResponse, UpdateGroupRequest, CreateGroupResponse, CreateGroupRequest, GroupInfo
from backend.models.db import DB_Connection, DB_Group

router = APIRouter(prefix="/db_groups", tags=["DB GROUPS"])


@router.get("/connection/{connection_id}", response_model=GetGroupsWithSyncResponse)
async def get_groups_auto_sync(connection_id: int, db: AsyncSession = Depends(get_db)):
    """Получить все группы с автоматической синхронизацией из внешней БД"""
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
        result = await group_service.get_or_sync_groups_by_connection(connection_id)
        response_data = {
            "connection_id": result["connection_id"],
            "connection_name": result["connection_name"],
            "auto_sync_performed": auto_sync_performed,
            "sync_successful": sync_successful,
            "total_groups": result["total_groups"],
            "groups": result["groups"],
            "last_sync_time": datetime.now() if auto_sync_performed else None
        }
        if sync_details:
            response_data["sync_statistics"] = sync_details.get("sync_statistics", {})
        return GetGroupsWithSyncResponse(**response_data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при получении групп: {str(e)}")


@router.get("/connection/{connection_id}/search", response_model=GetGroupsWithSyncResponse)
async def search_groups_with_sync(
    connection_id: int,
    q: Optional[str] = Query(None, description="Поиск по name или description (регистронезависимый, частичный)"),
    db: AsyncSession = Depends(get_db)
):
    """Поиск групп с предварительной синхронизацией, затем ищет по локальным данным"""
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
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Ошибка синхронизации перед поиском: {str(e)}"
                )
        conn_result = await db.execute(select(DB_Connection).where(DB_Connection.id == connection_id))
        connection = conn_result.scalar_one_or_none()
        if not connection:
            raise ValueError(f"Подключение с ID {connection_id} не найдено")
        query = select(DB_Group).where(DB_Group.connection_id == connection_id)
        if q and q.strip():
            q_clean = q.strip().lower()
            query = query.where(
                or_(
                    func.lower(DB_Group.name).contains(q_clean),
                    func.lower(DB_Group.description).contains(q_clean)
                )
            )
        query = query.order_by(DB_Group.name)
        result = await db.execute(query)
        filtered_groups = result.scalars().all()
        external_groups = await group_service.get_groups_from_database(connection)
        external_by_name = {g["name"]: g["user_count"] for g in external_groups}
        response_groups = [
            {
                "id": g.id,
                "oid": g.oid,
                "name": g.name,
                "description": g.description,
                "user_count": external_by_name.get(g.name, 0),
                "created_at": g.created_at,
                "updated_at": g.updated_at
            }
            for g in filtered_groups
        ]
        response_data = {
            "connection_id": connection.id,
            "connection_name": connection.name,
            "auto_sync_performed": auto_sync_performed,
            "sync_successful": sync_successful,
            "total_groups": len(response_groups),
            "groups": response_groups,
            "last_sync_time": datetime.now() if auto_sync_performed else None
        }
        if sync_details:
            response_data["sync_statistics"] = sync_details.get("sync_statistics", {})
        return GetGroupsWithSyncResponse(**response_data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при поиске групп: {str(e)}"
        )

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
