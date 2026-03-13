import asyncio
import logging

from sqlalchemy.exc import SQLAlchemyError

from backend.database.session import Base, engine
from backend.main import ensure_admin_user

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def init_db_and_admin() -> None:
    max_attempts = 20
    retry_delay_seconds = 2

    for attempt in range(1, max_attempts + 1):
        try:
            async with engine.begin() as conn:
                logger.info("🔄 [docker-init] Создание таблиц базы данных...")
                await conn.run_sync(Base.metadata.create_all)
                logger.info("✅ [docker-init] Таблицы базы данных успешно созданы")
            break
        except SQLAlchemyError as exc:
            if attempt == max_attempts:
                logger.error(
                    "❌ [docker-init] Ошибка при создании таблиц после %s попыток: %s",
                    max_attempts,
                    exc,
                )
                raise

            logger.warning(
                "⚠️ [docker-init] База данных недоступна (попытка %s/%s): %s. Повтор через %s сек...",
                attempt,
                max_attempts,
                exc,
                retry_delay_seconds,
            )
            await asyncio.sleep(retry_delay_seconds)

    await ensure_admin_user()


if __name__ == "__main__":
    asyncio.run(init_db_and_admin())
