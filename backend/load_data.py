import asyncio
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from backend.database.session import AsyncSessionLocal
from backend.services.app_content_services import AppContentService


async def seed_app_content():
    """Добавление контента приложения (соглашения и документация)"""
    content_data = [
        {
            "content_type": "agreement",
            "number": "1",
            "title": "Обязанности сторон",
            "content": "Настоящее соглашение определяет права и обязанности Пользователя и Администрации сервиса в процессе использования предоставляемых функций и возможностей. Каждая из сторон обязуется строго соблюдать условия, изложенные ниже, и несёт ответственность за их невыполнение в соответствии с действующим законодательством и положениями настоящего Соглашения.",
            "is_active": True,
        },
        {
            "content_type": "agreement",
            "number": "2",
            "title": "Соглашение о неразглашении",
            "content": "Стороны обязуются не разглашать конфиденциальную информацию, полученную в ходе взаимодействия. За нарушение обязательств, предусмотренных настоящим Соглашением, стороны несут ответственность в соответствии с действующим законодательством и положениями Соглашения.",
            "is_active": True,
        },
        {
            "content_type": "agreement",
            "number": "3",
            "title": "Условия обработки данных",
            "content": "Пользователь даёт согласие на обработку своих персональных данных в соответствии с законодательством. Пользователь несёт полную ответственность за все действия, совершённые с использованием его учётной записи, а также за любые последствия, вытекающие из таких действий.",
            "is_active": True,
        },
        {
            "content_type": "documentation",
            "number": "1",
            "title": "Руководство пользователя",
            "content": "Данное руководство описывает основные функции и возможности системы. Ознакомьтесь с ним перед началом работы.",
            "is_active": True,
        },
        {
            "content_type": "documentation",
            "number": "2",
            "title": "API Документация",
            "content": "Полное описание всех доступных API-методов, параметров запросов и форматов ответов.",
            "is_active": True,
        },
        {
            "content_type": "documentation",
            "number": "3",
            "title": "Безопасность данных",
            "content": "Рекомендации по обеспечению безопасности данных и лучшие практики работы с системой.",
            "is_active": True,
        },
    ]

    async with AsyncSessionLocal() as session:
        service = AppContentService(session)
        try:
            # Используем сервис для массового создания
            created = await service.bulk_create_documentations(content_data)

            # 🔑 КРИТИЧЕСКИ ВАЖНО: фиксируем транзакцию
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