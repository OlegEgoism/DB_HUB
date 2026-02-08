# backend/services/app_content_services.py
import math
from typing import Literal

from sqlalchemy import and_, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.app_content import AppContent
from backend.schemas.app_content_schemas import AppContentCreate, AppContentUpdate

ContentType = Literal["agreement", "documentation"]


class AppContentService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_content(self, content_id: int) -> AppContent | None:
        """Получить контент по ID"""
        result = await self.db.execute(select(AppContent).where(AppContent.id == content_id))
        return result.scalar_one_or_none()

    async def get_content_by_type_and_number(self, content_type: ContentType, number: str) -> AppContent | None:
        """Получить контент по типу и номеру"""
        result = await self.db.execute(select(AppContent).where(AppContent.content_type == content_type, AppContent.number == number))
        return result.scalar_one_or_none()

    async def get_content_by_type_and_title(self, content_type: ContentType, title: str) -> AppContent | None:
        """Получить контент по типу и заголовку"""
        result = await self.db.execute(select(AppContent).where(AppContent.content_type == content_type, AppContent.title == title))
        return result.scalar_one_or_none()

    async def list_content(
        self,
        content_type: ContentType | None = None,
        is_active: bool | None = None,
        page: int = 1,
        size: int = 20,
        search: str | None = None,
    ) -> dict:
        """Получить список контента с пагинацией"""
        query = select(AppContent)
        count_query = select(func.count(AppContent.id))
        filters = []
        if content_type:
            filters.append(AppContent.content_type == content_type)
        if is_active is not None:
            filters.append(AppContent.is_active == is_active)
        if search and search.strip():
            term = f"%{search.strip()}%"
            filters.append(
                or_(
                    AppContent.number.ilike(term),
                    AppContent.title.ilike(term),
                    AppContent.content.ilike(term),
                )
            )
        if filters:
            query = query.where(and_(*filters))
            count_query = count_query.where(and_(*filters))
        total_result = await self.db.execute(count_query)
        total = total_result.scalar_one()
        offset = (page - 1) * size
        query = query.order_by(AppContent.number.asc()).offset(offset).limit(size)
        result = await self.db.execute(query)
        items = result.scalars().all()
        pages = math.ceil(total / size) if size > 0 and total > 0 else 1
        has_next = page < pages
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

    async def list_agreements(self, is_active: bool | None = None, **kwargs) -> dict:
        """Получить список соглашений"""
        return await self.list_content(content_type="agreement", is_active=is_active, **kwargs)

    async def list_documentations(self, is_active: bool | None = None, **kwargs) -> dict:
        """Получить список документаций"""
        return await self.list_content(content_type="documentation", is_active=is_active, **kwargs)

    async def create_content(self, content_data: AppContentCreate) -> AppContent:
        """Создать новый контент"""
        existing_by_number = await self.get_content_by_type_and_number(content_data.content_type, content_data.number)
        if existing_by_number:
            raise ValueError(f"Контент типа '{content_data.content_type}' с номером '{content_data.number}' уже существует")
        existing_by_title = await self.get_content_by_type_and_title(content_data.content_type, content_data.title)
        if existing_by_title:
            raise ValueError(f"Контент типа '{content_data.content_type}' с заголовком '{content_data.title}' уже существует")
        content = AppContent(**content_data.model_dump())
        self.db.add(content)
        try:
            await self.db.commit()
            await self.db.refresh(content)
            return content
        except IntegrityError as e:
            await self.db.rollback()
            raise ValueError(f"Ошибка при создании контента: {str(e)}") from e

    async def update_content(self, content_id: int, content_data: AppContentUpdate) -> AppContent | None:
        """Обновить контент"""
        content = await self.get_content(content_id)
        if not content:
            return None
        update_data = content_data.model_dump(exclude_unset=True)
        if "number" in update_data and update_data["number"] != content.number:
            existing = await self.get_content_by_type_and_number(content.content_type, update_data["number"])
            if existing:
                raise ValueError(f"Контент типа '{content.content_type}' с номером '{update_data['number']}' уже существует")
        if "title" in update_data and update_data["title"] != content.title:
            existing = await self.get_content_by_type_and_title(content.content_type, update_data["title"])
            if existing:
                raise ValueError(f"Контент типа '{content.content_type}' с заголовком '{update_data['title']}' уже существует")
        for field, value in update_data.items():
            if value is not None:
                setattr(content, field, value)
        try:
            await self.db.commit()
            await self.db.refresh(content)
            return content
        except IntegrityError as e:
            await self.db.rollback()
            raise ValueError(f"Ошибка при обновлении контента: {str(e)}") from e

    async def delete_content(self, content_id: int) -> bool:
        """Удалить контент"""
        content = await self.get_content(content_id)
        if not content:
            return False
        await self.db.delete(content)
        await self.db.commit()
        return True

    async def toggle_active(self, content_id: int) -> AppContent | None:
        """Переключить статус активности"""
        content = await self.get_content(content_id)
        if not content:
            return None
        content.is_active = not content.is_active
        await self.db.commit()
        await self.db.refresh(content)
        return content

    async def bulk_create_agreements(self, agreements_data: list[dict]) -> list[AppContent]:
        """Массовое создание соглашений"""
        created = []
        for data in agreements_data:
            content_data = AppContentCreate(content_type="agreement", **data)
            try:
                content = await self.create_content(content_data)
                created.append(content)
            except ValueError:
                # Пропускаем дубликаты
                continue
        return created

    async def bulk_create_documentations(self, contents: list[dict]) -> list[AppContent]:
        created = []
        for content_data in contents:
            schema = AppContentCreate.model_validate(content_data)
            obj = AppContent(**schema.model_dump())
            self.db.add(obj)  # ✅ Используем правильный атрибут self.db
            created.append(obj)
        await self.db.flush()
        return created
