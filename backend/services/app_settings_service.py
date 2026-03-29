from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.connection_tab_settings import ConnectionTabSettings
from backend.schemas.app_settings_schemas import ConnectionTabsVisibility


class AppSettingsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_connection_tab_settings(self, user_id: int) -> ConnectionTabsVisibility:
        result = await self.db.execute(select(ConnectionTabSettings).where(ConnectionTabSettings.user_id == user_id))
        settings = result.scalar_one_or_none()

        if settings is None:
            default_visibility = ConnectionTabsVisibility()
            settings = ConnectionTabSettings(user_id=user_id, tabs_visibility=default_visibility.model_dump())
            self.db.add(settings)
            await self.db.flush()
            return default_visibility

        return ConnectionTabsVisibility(**(settings.tabs_visibility or {}))

    async def update_connection_tab_settings(self, user_id: int, visibility: ConnectionTabsVisibility) -> ConnectionTabsVisibility:
        result = await self.db.execute(select(ConnectionTabSettings).where(ConnectionTabSettings.user_id == user_id))
        settings = result.scalar_one_or_none()

        if settings is None:
            settings = ConnectionTabSettings(user_id=user_id, tabs_visibility=visibility.model_dump())
            self.db.add(settings)
        else:
            settings.tabs_visibility = visibility.model_dump()

        await self.db.flush()
        return visibility
