# backend/schemas/db_group_schemas.py
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class SyncMode(str, Enum):
    """Режимы синхронизации"""
    NONE = "none"
    SMART = "smart"
    FORCE = "force"


class GroupInfo(BaseModel):
    """Краткая информация о группе для ответа"""
    id: int
    name: str
    description: Optional[str]
    description_protected: bool
    user_count: int
    created_at: datetime
    updated_at: datetime


class GetGroupsWithSyncResponse(BaseModel):
    """Общий ответ для GET запроса с синхронизацией"""
    connection_id: int
    connection_name: str
    auto_sync_performed: bool = Field(..., description="Была ли выполнена автоматическая синхронизация")
    sync_successful: bool = Field(..., description="Успешна ли была синхронизация")
    sync_mode: SyncMode = Field(..., description="Режим синхронизации")
    total_groups: int = Field(..., description="Всего групп после синхронизации")
    groups: List[GroupInfo] = Field(..., description="Список групп")
    sync_statistics: Optional[Dict[str, Any]] = Field(None, description="Статистика синхронизации")
    sync_error: Optional[str] = Field(None, description="Ошибка при синхронизации")
    last_sync_time: Optional[datetime] = Field(None, description="Время последней синхронизации")
    sync_reason: Optional[str] = Field(
        None,
        description="Причина синхронизации: no_data, outdated, manual, force, changes_detected"
    )

    model_config = ConfigDict(from_attributes=True)
