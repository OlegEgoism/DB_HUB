# backend/schemas/db_schema_schemas.py
import re
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any


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


class DBSchemaUpdateRequest(BaseModel):
    """Запрос для обновления схемы"""
    name: Optional[str] = Field(None, min_length=1, max_length=63, description="Новое имя схемы. Должно начинаться с буквы или подчёркивания, может содержать только латинские буквы, цифры и подчёркивания.")
    description: Optional[str] = Field(None, max_length=1000, description="Новое описание схемы.")

    @field_validator('name')
    @classmethod
    def validate_schema_name(cls, v):
        if v is None:
            return v
        if not re.match(r"^[a-zA-Z_][a-zA-Z0-9_]*$", v):
            raise ValueError("Имя схемы должно начинаться с буквы или подчёркивания и содержать только латинские буквы, цифры и подчёркивания")
        if v.startswith('pg_'):
            raise ValueError("Имя схемы не может начинаться с 'pg_'")
        if v == 'information_schema':
            raise ValueError("Имя схемы не может быть 'information_schema'")
        return v


class DBSchemaUpdateResponse(BaseModel):
    """Ответ при обновлении схемы"""
    message: str
    changes: Dict[str, Any]
    schema: DBSchemaInfo


# class DBSchemaStatsRequest(BaseModel):
#     """Запрос для получения статистики по схемам"""
#     search: Optional[str] = Field(None, description="Поиск по имени схемы, владельцу или описанию")
#     page: int = Field(1, ge=1, description="Номер страницы")
#     size: int = Field(20, ge=1, le=200, description="Размер страницы")
#     sort_by: str = Field("name", description="Поле для сортировки (name, owner, size_bytes, table_count)")
#     sort_order: str = Field("asc", description="Порядок сортировки (asc/desc)")
