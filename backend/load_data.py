# scripts/seed_agreements.py

import asyncio
import sys
from pathlib import Path

from backend.models.documentations import Documentation

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from backend.database.session import AsyncSessionLocal
from backend.models.agreement import Agreement


async def seed_agreements():
    agreements_data = [
        {
            "number": "1",
            "title": "Обязанности сторон",
            "content": "Настоящее соглашение определяет права и обязанности Пользователя и Администрации сервиса в процессе использования предоставляемых функций и возможностей. Каждая из сторон обязуется строго соблюдать условия, изложенные ниже, и несёт ответственность за их невыполнение в соответствии с действующим законодательством и положениями настоящего Соглашения.",
            "is_active": True,
        },
        {
            "number": "2",
            "title": "Соглашение о неразглашении",
            "content": "Стороны обязуются не разглашать конфиденциальную информацию, полученную в ходе взаимодействия. За нарушение обязательств, предусмотренных настоящим Соглашением, стороны несут ответственность в соответствии с действующим законодательством и положениями Соглашения.",
            "is_active": True,
        },
        {
            "number": "3",
            "title": "Условия обработки данных",
            "content": "Пользователь даёт согласие на обработку своих персональных данных в соответствии с законодательством. Пользователь несёт полную ответственность за все действия, совершённые с использованием его учётной записи, а также за любые последствия, вытекающие из таких действий.",
            "is_active": True,
        },
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


async def seed_documentations():
    documentations_data = [
        {
            "number": "1",
            "title": "Руководство пользователя",
            "content": "Данное руководство описывает основные функции и возможности системы. Ознакомьтесь с ним перед началом работы.",
            "is_active": True,
        },
        {
            "number": "2",
            "title": "API Документация",
            "content": "Полное описание всех доступных API-методов, параметров запросов и форматов ответов.",
            "is_active": True,
        },
        {
            "number": "3",
            "title": "Безопасность данных",
            "content": "Рекомендации по обеспечению безопасности данных и лучшие практики работы с системой.",
            "is_active": True,
        },
    ]

    async with AsyncSessionLocal() as session:
        try:
            for data in documentations_data:
                documentation = Documentation(**data)
                session.add(documentation)
            await session.commit()
            print("Документации успешно добавлены в базу данных.")
        except Exception as e:
            print(f"❌ Ошибка при добавлении документаций: {e}")
            await session.rollback()


if __name__ == "__main__":
    asyncio.run(seed_documentations())
