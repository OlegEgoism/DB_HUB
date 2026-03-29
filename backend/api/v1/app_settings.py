from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.v1.app_auth import get_current_user
from backend.database.session import get_db
from backend.models.user import User
from backend.schemas.app_settings_schemas import ConnectionTabSettingsResponse, ConnectionTabSettingsUpdate
from backend.services.app_settings_service import AppSettingsService

router = APIRouter(prefix="/app_settings", tags=["APP SETTINGS"])


@router.get("/connection-tabs", response_model=ConnectionTabSettingsResponse)
async def get_connection_tab_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = AppSettingsService(db)
    tabs_visibility = await service.get_connection_tab_settings(current_user.id)
    return ConnectionTabSettingsResponse(tabs_visibility=tabs_visibility)


@router.put("/connection-tabs", response_model=ConnectionTabSettingsResponse)
async def update_connection_tab_settings(
    payload: ConnectionTabSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = AppSettingsService(db)
    tabs_visibility = await service.update_connection_tab_settings(current_user.id, payload.tabs_visibility)
    return ConnectionTabSettingsResponse(tabs_visibility=tabs_visibility)
