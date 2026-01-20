# backend/schemas/db_tables_schemas.py
from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional


class TableInfo(BaseModel):
    table_name: str
    owner: str
    description: Optional[str] = None
    row_count: int = Field(
        ..., description="Оценка количества строк (pg_class.reltuples)"
    )
    size_bytes: int = Field(
        ..., description="Размер таблицы в байтах (pg_total_relation_size)"
    )
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


class PaginatedTablePrivilegesUsersResponse(BaseModel):
    connection_id: int
    connection_name: str
    total_tables: int
    total_filtered_tables: int
    page: int
    size: int
    pages: int
    has_next: bool
    has_prev: bool
    table_privileges: List[TablePrivilegeInfo]
    model_config = ConfigDict(from_attributes=True)


class TablePrivilegeUpdateItem(BaseModel):
    username: str
    select: bool
    insert: bool
    update: bool
    delete: bool
    truncate: bool


class TablePrivilegesUpdateRequest(BaseModel):
    schema_name: str
    table_name: str
    users: List[TablePrivilegeUpdateItem]


class TablePrivilegesUpdateResponse(BaseModel):
    message: str
    updated_users: List[str]


class TableGroupPrivilegeUpdateItem(BaseModel):
    groupname: str
    select: bool
    insert: bool
    update: bool
    delete: bool
    truncate: bool


class TablePrivilegesGroupsUpdateRequest(BaseModel):
    schema_name: str
    table_name: str
    groups: List[TableGroupPrivilegeUpdateItem]


class TablePrivilegesGroupsUpdateResponse(BaseModel):
    message: str
    updated_groups: List[str]


class TableGroupPrivilege(BaseModel):
    group: str
    select: bool
    insert: bool
    update: bool
    delete: bool
    truncate: bool


class TablePrivilegeGroupInfo(BaseModel):
    schema_name: str
    table_name: str
    owner: str
    group_privileges: List[TableGroupPrivilege]


class PaginatedTablePrivilegesGroupsResponse(BaseModel):
    connection_id: int
    connection_name: str
    requested_groups: List[str]
    total_tables: int
    total_filtered_tables: int
    page: int
    size: int
    pages: int
    has_next: bool
    has_prev: bool
    table_privileges: List[TablePrivilegeGroupInfo]
    model_config = ConfigDict(from_attributes=True)
