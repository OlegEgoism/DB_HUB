# backend/utils/pagination.py
import math
from typing import TypeVar, Generic, List, Dict, Any
from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


class PaginatedResponse(BaseModel, Generic[T]):
    """Общий класс для пагинации"""

    items: List[T]
    total: int
    page: int
    size: int
    pages: int
    has_next: bool
    has_prev: bool

    @classmethod
    def create(
        cls,
        items: List[T],
        total: int,
        page: int,
        size: int,
        pages: int = None,
        has_next: bool = None,
        has_prev: bool = None,
    ) -> Dict[str, Any]:
        """Создать пагинированный ответ"""
        if pages is None:
            pages = math.ceil(total / size) if size > 0 and total > 0 else 1
        if has_next is None:
            has_next = page < pages
        if has_prev is None:
            has_prev = page > 1

        return {
            "items": items,
            "total": total,
            "page": page,
            "size": size,
            "pages": pages,
            "has_next": has_next,
            "has_prev": has_prev,
        }


class PaginatedServiceResponse(BaseModel):
    """Класс для пагинации в сервисах (без generic)"""

    connection_id: int
    connection_name: str
    total_items: int
    total_filtered_items: int
    page: int
    size: int
    pages: int
    has_next: bool
    has_prev: bool

    @classmethod
    def prepare_response(
        cls,
        connection_id: int,
        connection_name: str,
        total_items: int,
        total_filtered_items: int,
        page: int,
        size: int,
    ) -> Dict[str, Any]:
        """Подготовить базовую структуру для ответа сервиса"""
        pages = (
            math.ceil(total_filtered_items / size)
            if size > 0 and total_filtered_items > 0
            else 1
        )
        has_next = page < pages
        has_prev = page > 1

        return {
            "connection_id": connection_id,
            "connection_name": connection_name,
            "total_items": total_items,
            "total_filtered_items": total_filtered_items,
            "page": page,
            "size": size,
            "pages": pages,
            "has_next": has_next,
            "has_prev": has_prev,
        }
