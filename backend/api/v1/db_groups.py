from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
from backend.database.session import get_db
from backend.services.db_group_service import DBGroupService
from backend.schemas.db_group_schemas import GetGroupsWithSyncResponse

router = APIRouter(prefix="/db_groups", tags=["DB GROUPS"])


@router.get("/connection/{connection_id}", response_model=GetGroupsWithSyncResponse)
async def get_groups_auto_sync(connection_id: int, db: AsyncSession = Depends(get_db)):
    """Список группы"""
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
