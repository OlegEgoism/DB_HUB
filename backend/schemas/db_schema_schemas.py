# backend/schemas/db_schema_schemas.py
from pydantic import BaseModel, Field
from typing import Optional, List


class DBSchemaInfo(BaseModel):
    """Информация о схеме из внешней БД"""
    oid: int = Field(..., description="OID схемы в БД")
    name: str = Field(..., description="Имя схемы")
    owner: str = Field(..., description="Владелец схемы")
    description: Optional[str] = Field(None, description="Описание схемы")
    size_bytes: int = Field(..., description="Размер схемы в байтах")
    size_pretty: str = Field(..., description="Человекочитаемый размер схемы")
    table_count: int = Field(0, description="Количество обычных таблиц")
    temp_table_count: int = Field(0, description="Количество временных таблиц")
    index_count: int = Field(0, description="Количество индексов")
    view_count: int = Field(0, description="Количество обычных представлений")
    materialized_view_count: int = Field(0, description="Количество материализованных представлений")
    procedure_count: int = Field(0, description="Количество процедур")
    function_count: int = Field(0, description="Количество функций")
    total_objects: int = Field(0, description="Общее количество объектов")


class PaginatedDBSchemasResponse(BaseModel):
    """Ответ с пагинацией для списка схем"""
    connection_id: int
    connection_name: str
    total_schemas: int
    total_filtered_schemas: int
    page: int
    size: int
    pages: int
    has_next: bool
    has_prev: bool
    schemas: List[DBSchemaInfo]


class DBSchemaStatsRequest(BaseModel):
    """Запрос для получения статистики по схемам"""
    search: Optional[str] = Field(None, description="Поиск по имени схемы, владельцу или описанию")
    page: int = Field(1, ge=1, description="Номер страницы")
    size: int = Field(20, ge=1, le=200, description="Размер страницы")
    sort_by: str = Field("name", description="Поле для сортировки (name, owner, size_bytes, table_count)")
    sort_order: str = Field("asc", description="Порядок сортировки (asc/desc)")