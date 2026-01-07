# scripts/seed_agreements.py
import asyncio
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from backend.database.session import AsyncSessionLocal
from backend.models.agreement import Agreement


async def seed_agreements():
    agreements_data = [
        {
            "number": "001",
            "title": "Пользовательское соглашение",
            "content": "Настоящее соглашение регулирует использование сервиса и определяет права и обязанности сторон.",
            "is_active": True
        },
        {
            "number": "002",
            "title": "Политика конфиденциальности",
            "content": "Документ описывает, каким образом и с какой целью осуществляется сбор, хранение и обработка персональных данных.",
            "is_active": True
        },
        {
            "number": "003",
            "title": "Соглашение о неразглашении",
            "content": "Стороны обязуются не разглашать конфиденциальную информацию, полученную в ходе взаимодействия.",
            "is_active": False
        },
        {
            "number": "004",
            "title": "Условия обработки данных",
            "content": "Пользователь даёт согласие на обработку своих персональных данных в соответствии с законодательством.",
            "is_active": True
        }
    ]

    async with AsyncSessionLocal() as session:
        try:
            for data in agreements_data:
                agreement = Agreement(**data)
                session.add(agreement)
            await session.commit()
            print("Соглашения успешно добавлены в базу данных.")
        except Exception as e:
            print(f"❌ Ошибка при добавлении соглашений: {e}")
            await session.rollback()


if __name__ == "__main__":
    asyncio.run(seed_agreements())
