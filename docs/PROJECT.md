# DB HUB — описание проекта и архитектура

## Назначение

Веб-приложение для управления **сохранёнными подключениями** к **PostgreSQL** и **Greenplum**: учётные записи в приложении, шифрование паролей внешних БД, просмотр схем, таблиц, представлений, индексов, функций, процедур, пользователей/групп сервера, метрик и выполнение запросов (в рамках прав пользователя внешней БД).

Метаданные приложения (пользователи приложения, подключения, настройки вкладок) хранятся в **SQLite** (`APP_DATABASE_URL`). Это не замена кластеру PostgreSQL/Greenplum — к ним приложение подключается как клиент.

## Стек

| Компонент | Технологии |
|-----------|------------|
| Backend | Python 3.13+, FastAPI, SQLAlchemy 2 (async), aiosqlite, slowapi (лимиты), JWT (python-jose), Fernet (пароли подключений) |
| Frontend | React 19, Vite 7, React Router 7, TypeScript, слой FSD |
| Контейнеры | Docker Compose: один fullstack-контейнер (см. `Dockerfile.fullstack` / `Dockerfile.fullstack.prod`) |

## Backend: структура и поток данных

```
backend/
├── api/v1/          # HTTP-роутеры (тонкий слой: валидация, зависимости, ответы)
├── services/        # Бизнес-логика и работа с внешней БД
├── schemas/         # Pydantic-модели запросов/ответов
├── models/          # SQLAlchemy-модели SQLite
├── database/        # engine, сессии
├── core/            # config, security, rate limit
└── utils/           # пагинация, хелперы подключения к внешней БД
```

- **Префикс API:** `/api/v1`.
- **Создание таблиц SQLite:** при старте приложения вызывается `Base.metadata.create_all` (отдельных миграций Alembic в репозитории нет).
- **Первый вход:** при отсутствии пользователя `admin` создаётся superuser; пароль по умолчанию задаётся в корневом `README.md` (сменить после первого входа).

### Модули `api/v1`

| Роутер | Назначение |
|--------|------------|
| `app_auth` | Логин, refresh, текущий пользователь |
| `app_users` | CRUD пользователей приложения (с учётом прав) |
| `app_settings` | Настройки приложения и вкладок подключения |
| `db_connections` | CRUD подключений к внешним БД |
| `db_schemas`, `db_tables`, `db_views`, `db_indexes` | Объекты каталога |
| `db_functions`, `db_procedures` | Рутины |
| `db_users`, `db_groups` | Роли/пользователи/группы на стороне сервера БД |
| `db_metrics` | Метрики (pg_stat и аналоги) |
| `db_query` | Выполнение SQL по активному подключению |

Внешние БД обходятся через **`backend/utils/external_db.py`** (asyncpg). В Docker при необходимости хост `localhost` может подменяться на шлюз к хост-машине (`DBHUB_MAP_LOCALHOST_TO_HOST` и связанные переменные — см. `README.md`).

## Frontend: Feature-Sliced Design

```
frontend/src/
├── app/       # корень, маршруты, layout
├── pages/     # страницы и композиция UI
├── widgets/   # крупные блоки интерфейса
├── features/  # сценарии (например, auth)
├── entities/  # доменные сущности (user, session) и API к backend
└── shared/    # http-клиент, конфиг маршрутов, i18n, утилиты
```

Сборка: `npm run build`. Сгенерированные каталоги `build/`, `.vite/`, `.react-router/` не хранятся в репозитории.

## Безопасность и конфигурация

- **`SECRET_KEY`, `ENCRYPTION_KEY`:** в production задать уникальные значения (см. `backend/core/config.py`, `backend/generate_app_key.py`).
- **CORS:** в `backend/main.py` разрешён `allow_origins=["*"]` — для публичного production лучше сузить до известных origin.
- **Лимиты:** эндпоинт логина ограничен slowapi (`app_auth`).
- **Пароли внешних БД:** хранятся в SQLite в зашифрованном виде (Fernet).

## Переменные окружения (backend)

Читаются через Pydantic Settings (`backend/core/config.py`), опционально из `.env` в корне репозитория:

- `APP_DATABASE_URL` — SQLite async URL.
- `ENCRYPTION_KEY` — URL-safe base64 ключ Fernet.
- `HOST`, `PORT` — bind uvicorn при ручном запуске.
- `SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS` — JWT.

Docker Compose задаёт переменные в секции `environment` файлов compose; отдельный `.env` для `docker compose up` **не обязателен**.

## Документация по развёртыванию

- Локальный и Docker quickstart: корневой `README.md`.
- Образ для Docker Hub и production-сборка: `docs/DOCKER_HUB_DEPLOYMENT.md`, `docker-compose.hub.yml`, `Dockerfile.fullstack.prod`.
