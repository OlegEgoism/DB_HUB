# backend/schemas/db_schema_schemas.py
from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional


class TableInfo(BaseModel):
    table_name: str
    owner: str
    description: Optional[str] = None
    row_count: int = Field(..., description="Оценка количества строк (pg_class.reltuples)")
    size_bytes: int = Field(..., description="Размер таблицы в байтах (pg_total_relation_size)")
    size_pretty: str = Field(..., description="Человекочитаемый размер MB")


class SchemaInfo(BaseModel):
    schema_name: str
    description: Optional[str] = None
    tables: List[TableInfo]


class PaginatedSchemasWithTablesResponse(BaseModel):
    connection_id: int
    connection_name: str
    total_schemas: int
    total_filtered_schemas: int
    page: int
    size: int
    pages: int
    has_next: bool
    has_prev: bool
    schemas: List[SchemaInfo]
    model_config = ConfigDict(from_attributes=True)


class PaginatedTemporaryTablesResponse(BaseModel):
    connection_id: int
    connection_name: str
    total_temp_tables: int
    total_filtered_temp_tables: int
    page: int
    size: int
    pages: int
    has_next: bool
    has_prev: bool
    temporary_tables: List[TableInfo]
    model_config = ConfigDict(from_attributes=True)


class ViewInfo(BaseModel):
    schema_name: str
    view_name: str
    description: Optional[str] = None
    definition: str


class PaginatedViewsResponse(BaseModel):
    connection_id: int
    connection_name: str
    total_views: int
    total_filtered_views: int
    page: int
    size: int
    pages: int
    has_next: bool
    has_prev: bool
    views: List[ViewInfo]
    model_config = ConfigDict(from_attributes=True)


class MaterializedViewInfo(BaseModel):
    schema_name: str
    view_name: str
    description: Optional[str] = None
    definition: str


class PaginatedMaterializedViewsResponse(BaseModel):
    connection_id: int
    connection_name: str
    total_materialized_views: int
    total_filtered_materialized_views: int
    page: int
    size: int
    pages: int
    has_next: bool
    has_prev: bool
    materialized_views: List[MaterializedViewInfo]
    model_config = ConfigDict(from_attributes=True)


class FunctionInfo(BaseModel):
    schema_name: str
    function_name: str
    description: Optional[str] = None
    definition: str


class PaginatedFunctionsResponse(BaseModel):
    connection_id: int
    connection_name: str
    total_functions: int
    total_filtered_functions: int
    page: int
    size: int
    pages: int
    has_next: bool
    has_prev: bool
    functions: List[FunctionInfo]
    model_config = ConfigDict(from_attributes=True)


class IndexInfo(BaseModel):
    schema_name: str
    index_name: str
    table_name: str
    description: Optional[str] = None
    definition: str


class PaginatedIndexesResponse(BaseModel):
    connection_id: int
    connection_name: str
    total_indexes: int
    total_filtered_indexes: int
    page: int
    size: int
    pages: int
    has_next: bool
    has_prev: bool
    indexes: List[IndexInfo]
    model_config = ConfigDict(from_attributes=True)


class SchemaRolePrivilege(BaseModel):
    role: str
    create: bool
    usage: bool


class SchemaPrivilegeInfo(BaseModel):
    schema_name: str
    owner: str
    description: Optional[str] = None
    role_privileges: List[SchemaRolePrivilege]


class SchemaPrivilegesResponse(BaseModel):
    connection_id: int
    connection_name: str
    schema_privileges: List[SchemaPrivilegeInfo]
    model_config = ConfigDict(from_attributes=True)


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


class TableUserPrivilege(BaseModel):
    user: str
    select: bool
    insert: bool
    update: bool
    delete: bool
    truncate: bool


class TablePrivilegeInfo(BaseModel):
    schema_name: str
    table_name: str
    owner: str
    user_privileges: List[TableUserPrivilege]


class TablePrivilegesLimitedResponse(BaseModel):
    connection_id: int
    connection_name: str
    table_privileges: List[TablePrivilegeInfo]
    model_config = ConfigDict(from_attributes=True)


class PaginatedSchemaPrivilegesResponse(BaseModel):
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
