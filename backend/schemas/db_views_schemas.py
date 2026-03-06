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


class ViewRolePrivilege(BaseModel):
    role: str
    create: bool
    usage: bool


class ViewPrivilegeInfo(BaseModel):
    schema_name: str
    view_name: str
    owner: str
    description: str | None = None
    role_privileges: list[ViewRolePrivilege]


class ViewGroupPrivilegeUpdateItem(BaseModel):
    groupname: str
    create: bool
    usage: bool


class ViewPrivilegesGroupsUpdateRequest(BaseModel):
    schema_name: str
    view_name: str
    groups: list[ViewGroupPrivilegeUpdateItem]


class ViewPrivilegesGroupsUpdateResponse(BaseModel):
    message: str
    updated_groups: list[str]


class PaginatedViewPrivilegesGroupsResponse(PaginatedServiceResponse):
    view_privileges: list[ViewPrivilegeInfo]
    model_config = ConfigDict(from_attributes=True)


class PaginatedMaterializedViewPrivilegesGroupsResponse(PaginatedServiceResponse):
    view_privileges: list[ViewPrivilegeInfo]
    model_config = ConfigDict(from_attributes=True)
