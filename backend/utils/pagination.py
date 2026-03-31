import math
from collections.abc import Callable
from typing import Any

from pydantic import BaseModel


class PaginatedResponse[T: BaseModel](BaseModel):
    """Универсальный класс для пагинированных ответов с элементами"""

    items: list[T]
    total: int
    page: int
    size: int
    pages: int
    has_next: bool
    has_prev: bool

    @classmethod
    def create(
        cls,
        items: list[T],
        total: int,
        page: int,
        size: int,
    ) -> dict[str, Any]:
        """Создание пагинированного ответа для списка элементов"""
        pages = math.ceil(total / size) if size > 0 and total > 0 else 1
        return {
            "items": items,
            "total": total,
            "page": page,
            "size": size,
            "pages": pages,
            "has_next": page < pages,
            "has_prev": page > 1,
        }


class PaginatedServiceResponse(BaseModel):
    """Базовый класс для пагинированных ответов сервисов с дополнительными полями"""

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
    ) -> dict[str, Any]:
        """Подготовка базового ответа для сервисов"""
        pages = math.ceil(total_filtered_items / size) if size > 0 and total_filtered_items > 0 else 1
        return {
            "connection_id": connection_id,
            "connection_name": connection_name,
            "total_items": total_items,
            "total_filtered_items": total_filtered_items,
            "page": page,
            "size": size,
            "pages": pages,
            "has_next": page < pages,
            "has_prev": page > 1,
        }


async def paginate_raw_sql(
    conn,
    base_query: str,
    count_query: str,
    page: int = 1,
    size: int = 20,
    params: list | None = None,
    row_mapper: Callable | None = None,
) -> tuple[list, int]:
    """Универсальная пагинация для SQL-запросов"""
    if page < 1:
        page = 1
    if size < 1:
        size = 1
    if size > 1000:
        size = 1000

    offset = (page - 1) * size
    total_row = await conn.fetchrow(count_query, *(params or []))
    total = total_row["total"] if total_row else 0

    paginated_query = f"{base_query} LIMIT {size} OFFSET {offset}"
    rows = await conn.fetch(paginated_query, *(params or []))

    if row_mapper:
        items = [row_mapper(row) for row in rows]
    else:
        items = [dict(row) for row in rows]

    return items, total


def calculate_pagination_info(total_items: int, page: int, size: int) -> dict[str, Any]:
    """Вычисляет информацию о пагинации"""
    if size <= 0:
        size = 20

    pages = math.ceil(total_items / size) if total_items > 0 else 1
    return {
        "page": page,
        "size": size,
        "pages": pages,
        "has_next": page < pages,
        "has_prev": page > 1,
    }
