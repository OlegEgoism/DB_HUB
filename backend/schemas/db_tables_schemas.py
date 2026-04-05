# backend/schemas/db_tables_schemas.py

from pydantic import BaseModel, ConfigDict, Field


class TableInfo(BaseModel):
    table_name: str
    owner: str
    description: str | None = None
    row_count: int = Field(..., description="Оценка количества строк (pg_class.reltuples)")
    size_bytes: int = Field(..., description="Размер таблицы в байтах (pg_total_relation_size)")
    size_pretty: str = Field(..., description="Человекочитаемый размер MB")


class SchemaInfo(BaseModel):
    schema_name: str
    description: str | None = None
    tables: list[TableInfo]


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
    schemas: list[SchemaInfo]
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
    temporary_tables: list[TableInfo]
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
    size_bytes: int = Field(..., description="Размер таблицы в байтах (pg_total_relation_size)")
    size_pretty: str = Field(..., description="Человекочитаемый размер таблицы")
    user_privileges: list[TableUserPrivilege]


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
    table_privileges: list[TablePrivilegeInfo]
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
    users: list[TablePrivilegeUpdateItem]


class TablePrivilegesUpdateResponse(BaseModel):
    message: str
    updated_users: list[str]


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
    groups: list[TableGroupPrivilegeUpdateItem]


class TablePrivilegesGroupsUpdateResponse(BaseModel):
    message: str
    updated_groups: list[str]


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
    size_bytes: int = Field(..., description="Размер таблицы в байтах (pg_total_relation_size)")
    size_pretty: str = Field(..., description="Человекочитаемый размер таблицы")
    group_privileges: list[TableGroupPrivilege]


class TableColumnInfo(BaseModel):
    column_name: str
    data_type: str
    is_nullable: bool
    column_default: str | None = None
    description: str | None = None
    character_maximum_length: int | None = None
    numeric_precision: int | None = None
    numeric_scale: int | None = None


class TableDetailsResponse(BaseModel):
    schema_name: str
    table_name: str
    owner: str
    description: str | None = None
    columns: list[TableColumnInfo]


class PaginatedTablePrivilegesGroupsResponse(BaseModel):
    connection_id: int
    connection_name: str
    requested_groups: list[str]
    total_tables: int
    total_filtered_tables: int
    page: int
    size: int
    pages: int
    has_next: bool
    has_prev: bool
    table_privileges: list[TablePrivilegeGroupInfo]
    model_config = ConfigDict(from_attributes=True)
