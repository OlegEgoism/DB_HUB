# backend/schemas/db_views_schemas.py

from pydantic import BaseModel, ConfigDict

from backend.utils.pagination import PaginatedServiceResponse


class ViewInfo(BaseModel):
    schema_name: str
    view_name: str
    description: str | None = None
    definition: str


class PaginatedViewsResponse(PaginatedServiceResponse):
    views: list[ViewInfo]
    model_config = ConfigDict(from_attributes=True)


class MaterializedViewInfo(BaseModel):
    schema_name: str
    view_name: str
    description: str | None = None
    definition: str


class PaginatedMaterializedViewsResponse(PaginatedServiceResponse):
    materialized_views: list[MaterializedViewInfo]
    model_config = ConfigDict(from_attributes=True)


class GroupViewPrivileges(BaseModel):
    groupname: str
    select: bool = False
    insert: bool = False
    update: bool = False
    delete: bool = False


class ViewPrivilegesGroupsUpdateRequest(BaseModel):
    schema_name: str
    view_name: str
    groups: list[GroupViewPrivileges]


class ViewPrivilegesGroupsUpdateResponse(BaseModel):
    message: str
    updated_groups: list[str]


class GroupMaterializedViewPrivileges(BaseModel):
    groupname: str
    select: bool = False


class MaterializedViewPrivilegesGroupsUpdateRequest(BaseModel):
    schema_name: str
    view_name: str
    groups: list[GroupMaterializedViewPrivileges]


class MaterializedViewPrivilegesGroupsUpdateResponse(BaseModel):
    message: str
    updated_groups: list[str]
