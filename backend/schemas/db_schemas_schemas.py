# backend/schemas/db_schemas_schemas.py
from pydantic import BaseModel, ConfigDict
from typing import List, Optional


class SchemaRolePrivilege(BaseModel):
    role: str
    create: bool
    usage: bool


class SchemaPrivilegeInfo(BaseModel):
    schema_name: str
    owner: str
    description: Optional[str] = None
    role_privileges: List[SchemaRolePrivilege]


class SchemaPrivilegeUpdateItem(BaseModel):
    username: str
    create: bool
    usage: bool


class SchemaPrivilegesUpdateRequest(BaseModel):
    schema_name: str
    users: List[SchemaPrivilegeUpdateItem]


class SchemaPrivilegesUpdateResponse(BaseModel):
    message: str
    updated_users: List[str]


class SchemaGroupPrivilegeUpdateItem(BaseModel):
    groupname: str
    create: bool
    usage: bool


class SchemaPrivilegesGroupsUpdateRequest(BaseModel):
    schema_name: str
    groups: List[SchemaGroupPrivilegeUpdateItem]


class SchemaPrivilegesGroupsUpdateResponse(BaseModel):
    message: str
    updated_groups: List[str]


class PaginatedSchemaPrivilegesUsersResponse(BaseModel):
    connection_id: int
    connection_name: str
    total_schemas: int
    total_filtered_schemas: int
    page: int
    size: int
    pages: int
    has_next: bool
    has_prev: bool
    schema_privileges: List[SchemaPrivilegeInfo]
    model_config = ConfigDict(from_attributes=True)


class PaginatedSchemaPrivilegesGroupsResponse(BaseModel):
    connection_id: int
    connection_name: str
    total_schemas: int
    total_filtered_schemas: int
    page: int
    size: int
    pages: int
    has_next: bool
    has_prev: bool
    schema_privileges: List[SchemaPrivilegeInfo]
    model_config = ConfigDict(from_attributes=True)
