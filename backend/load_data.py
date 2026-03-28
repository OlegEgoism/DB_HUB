import asyncio
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from backend.database.session import AsyncSessionLocal
from backend.services.app_content_services import AppContentService


async def seed_app_content():
    """Добавление контента приложения"""
    content_data = [
        {
            "content_type": "guide",
            "number": "1",
            "title": "Руководство пользователя",
            "content": "Данное руководство описывает основные функции и возможности системы.",
            "is_active": True,
        },
        {
            "content_type": "policy",
            "number": "1",
            "title": "Политика безопасности",
            "content": "Базовые рекомендации по защите данных и управлению доступом.",
            "is_active": True,
        },
        {
            "content_type": "faq",
            "number": "1",
            "title": "Частые вопросы",
            "content": "Ответы на популярные вопросы по работе с платформой.",
            "is_active": True,
        },
    ]

    async with AsyncSessionLocal() as session:
        service = AppContentService(session)
        try:
            created = await service.bulk_create_contents(content_data)
            await session.commit()

            print(f"✅ Контент успешно добавлен в БД: {len(created)} записей")
            for item in created:
                print(f"   • [{item.content_type}] №{item.number} — {item.title}")
        except Exception as e:
            print(f"❌ Ошибка при добавлении контента: {type(e).__name__}: {e}")
            await session.rollback()
            raise


if __name__ == "__main__":
    print("🌱 Запуск сидирования контента приложения...")
    try:
        asyncio.run(seed_app_content())
        print("✅ Сидирование контента завершено успешно!")
    except Exception as e:
        print(f"💥 КРИТИЧЕСКАЯ ОШИБКА: {e}")
        sys.exit(1)
