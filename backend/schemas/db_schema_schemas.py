# backend/schemas/db_schema_schemas.py
import re
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any


class TableInfo(BaseModel):
    """Информация о таблице в схеме"""
    oid: int = Field(..., description="OID таблицы в БД")
    table_name: str = Field(..., description="Имя таблицы")
    table_type: str = Field(..., description="Тип таблицы (table, view, materialized_view, foreign_table, partitioned_table)")
    owner: str = Field(..., description="Владелец таблицы")
    description: Optional[str] = Field(None, description="Описание таблицы")
    size_bytes: int = Field(..., description="Размер таблицы в байтах")
    size_pretty: str = Field(..., description="Человекочитаемый размер таблицы")
    estimated_row_count: Optional[int] = Field(None, description="Оценочное количество строк")


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
    tables: List[TableInfo] = Field(default_factory=list, description="Список таблиц в схеме")


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
