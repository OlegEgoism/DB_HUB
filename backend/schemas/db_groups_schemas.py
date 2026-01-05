# backend/schemas/db_groups_schemas.py
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class GroupInfo(BaseModel):
    id: int
    oid: Optional[int] = Field(None)
    name: str
    description: Optional[str]
    user_count: int
    created_at: datetime
    updated_at: datetime


class PaginatedGroupsResponse(BaseModel):
    """Схема для ответа с пагинацией групп"""
    connection_id: int
    connection_name: str
    auto_sync_performed: bool = Field(..., description="Была ли выполнена автоматическая синхронизация")
    sync_successful: bool = Field(..., description="Успешна ли была синхронизация")
    total: int = Field(..., description="Общее количество групп после фильтрации")
    page: int = Field(..., description="Текущая страница")
    size: int = Field(..., description="Количество групп на странице")
    pages: int = Field(..., description="Общее количество страниц")
    has_next: bool = Field(..., description="Есть ли следующая страница")
    has_prev: bool = Field(..., description="Есть ли предыдущая страница")
    groups: List[GroupInfo] = Field(..., description="Список групп")
    sync_statistics: Optional[Dict[str, Any]] = Field(None, description="Статистика синхронизации")
    sync_error: Optional[str] = Field(None, description="Ошибка при синхронизации")
    last_sync_time: Optional[datetime] = Field(None, description="Время последней синхронизации")
    model_config = ConfigDict(from_attributes=True)


class UpdateGroupRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None)


class CreateGroupRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = Field(None)


class GroupMemberInfo(BaseModel):
    user_oid: int
    username: str
    rolsuper: bool


class GroupMembersResponse(BaseModel):
    group_id: int
    group_name: str
    connection_id: int
    connection_name: str
    total_members: int
    members: List[GroupMemberInfo]
