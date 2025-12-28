# backend/schemas/db_group_schemas.py
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class GroupInfo(BaseModel):
    id: int
    oid: Optional[int] = Field(None)
    name: str
    description: Optional[str]
    user_count: int  # только для отображения, не сохраняется в БД
    created_at: datetime
    updated_at: datetime


class GetGroupsWithSyncResponse(BaseModel):
    connection_id: int
    connection_name: str
    auto_sync_performed: bool = Field(..., description="Была ли выполнена автоматическая синхронизация")
    sync_successful: bool = Field(..., description="Успешна ли была синхронизация")
    total_groups: int = Field(..., description="Всего групп после синхронизации")
    groups: List[GroupInfo] = Field(..., description="Список групп")
    sync_statistics: Optional[Dict[str, Any]] = Field(None, description="Статистика синхронизации")
    sync_error: Optional[str] = Field(None, description="Ошибка при синхронизации")
    last_sync_time: Optional[datetime] = Field(None, description="Время последней синхронизации")
    sync_reason: Optional[str] = Field(None, description="Причина синхронизации")

    model_config = ConfigDict(from_attributes=True)


class UpdateGroupRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None)


class CreateGroupRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = Field(None)


class CreateGroupResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    user_count: int
    created_at: datetime
    connection_id: int

    model_config = ConfigDict(from_attributes=True)


class DeleteGroupResponse(BaseModel):
    message: str
    deleted_group_id: int
    group_name: str
    connection_id: int


# backend/schemas/db_group_schemas.py

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
