# backend/schemas/db_schemas_schemas.py

from pydantic import BaseModel, ConfigDict


class SchemaRolePrivilege(BaseModel):
    role: str
    create: bool
    usage: bool


class SchemaPrivilegeInfo(BaseModel):
    schema_name: str
    owner: str
    description: str | None = None
    role_privileges: list[SchemaRolePrivilege]


class SchemaPrivilegeUpdateItem(BaseModel):
    username: str
    create: bool
    usage: bool


class SchemaPrivilegesUpdateRequest(BaseModel):
    schema_name: str
    users: list[SchemaPrivilegeUpdateItem]


class SchemaPrivilegesUpdateResponse(BaseModel):
    message: str
    updated_users: list[str]


class SchemaGroupPrivilegeUpdateItem(BaseModel):
    groupname: str
    create: bool
    usage: bool


class SchemaPrivilegesGroupsUpdateRequest(BaseModel):
    schema_name: str
    groups: list[SchemaGroupPrivilegeUpdateItem]


class SchemaPrivilegesGroupsUpdateResponse(BaseModel):
    message: str
    updated_groups: list[str]


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
    schema_privileges: list[SchemaPrivilegeInfo]
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
    schema_privileges: list[SchemaPrivilegeInfo]
    model_config = ConfigDict(from_attributes=True)
