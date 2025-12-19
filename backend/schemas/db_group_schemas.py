from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class GroupInfo(BaseModel):
    """Краткая информация о группе для ответа"""
    id: int
    name: str
    description: Optional[str]
    user_count: int
    created_at: datetime
    updated_at: datetime


class GetGroupsWithSyncResponse(BaseModel):
    """Общий ответ для GET запроса с синхронизацией"""
    connection_id: int
    connection_name: str
    auto_sync_performed: bool = Field(..., description="Была ли выполнена автоматическая синхронизация")
    sync_successful: bool = Field(..., description="Успешна ли была синхронизация")
    total_groups: int = Field(..., description="Всего групп после синхронизации")
    groups: List[GroupInfo] = Field(..., description="Список групп")
    sync_statistics: Optional[Dict[str, Any]] = Field(None, description="Статистика синхронизации")
    sync_error: Optional[str] = Field(None, description="Ошибка при синхронизации")
    last_sync_time: Optional[datetime] = Field(None, description="Время последней синхронизации")
    sync_reason: Optional[str] = Field(None, description="Причина синхронизации: no_data, outdated, manual, force, changes_detected")
    model_config = ConfigDict(from_attributes=True)


class UpdateGroupRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="Новое имя группы (роли). Должно быть уникальным во внешней БД.")
    description: Optional[str] = Field(None, description="Новое описание группы (хранится только локально)")


class CreateGroupRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=50, description="Имя группы (роли)")
    description: Optional[str] = Field(None, description="Описание (сохраняется только локально)")


class CreateGroupResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    user_count: int
    created_at: datetime
    connection_id: int
    model_config = ConfigDict(from_attributes=True)
