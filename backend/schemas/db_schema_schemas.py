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


class DBSchemaCreateRequest(BaseModel):
    """Запрос для создания схемы"""
    name: str = Field(..., min_length=1, max_length=63, description="Имя новой схемы. Должно начинаться с буквы или подчёркивания, может содержать только латинские буквы, цифры и подчёркивания.")
    owner: Optional[str] = Field(None, description="Владелец схемы. Если не указан, владельцем становится текущий пользователь.")
    description: Optional[str] = Field(None, max_length=1000, description="Описание схемы.")


class DBSchemaCreateResponse(BaseModel):
    """Ответ при создании схемы"""
    message: str
    schema: DBSchemaInfo


class DBSchemaDeleteRequest(BaseModel):
    """Запрос для удаления схемы"""
    schema_name: str = Field(..., min_length=1, max_length=63, description="Имя схемы для удаления")
    cascade: bool = Field(False, description="Если True, удаляет схему вместе со всеми объектами внутри. Если False и в схеме есть объекты, операция завершится ошибкой.")

    @field_validator('schema_name')
    @classmethod
    def validate_schema_name(cls, v):
        if v.startswith("pg_") or v == "information_schema":
            raise ValueError("Нельзя удалять системные схемы (pg_*, information_schema)")
        return v


class DBSchemaDeleteResponse(BaseModel):
    """Ответ при удалении схемы"""
    message: str
    deleted_schema: Dict[str, Any]


class DBSchemaUpdateRequest(BaseModel):
    """Запрос для обновления схемы"""
    name: Optional[str] = Field(None, min_length=1, max_length=63, description="Новое имя схемы")
    description: Optional[str] = Field(None, max_length=1000, description="Новое описание схемы")

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
