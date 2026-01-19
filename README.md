# DB HUB 

```
Версия: Python 3.13 / PostgreSQL 13+ / Greenplum 6+
При первом запуске приложения все таблицы будут созданы автоматически
API документация: 
        http://127.0.0.1:8000/docs 
        http://127.0.0.1:8000/redoc
```
# Реализовано
```
Управление подключениями к PostgreSQL/Greenplum
CRUD для пользователей и групп во внешних БД
Просмотр и управление схемами, таблицами, представлениями, индексами, функциями, процедурами
Гранулярное управление привилегиями (на уровне схем и таблиц — для пользователей и групп)
Метрики и настройки БД
Активные сессии + возможность завершать процессы
JWT-аутентификация, роли, соглашения
Поиск, пагинация, фильтрация почти везде
```

# Что стоит добавить
```
Ограничение IP-адресов
Аудит действий
Срок действия паролей
SQL-редактор (базовый)
```

<h3 style="color: #2486b5; text-align: center">
Структура backend приложения DB HUB
</h3>

```
DB_HUB/
└── backend/
    ├── api/
    │   └── v1/
    ├── core/
    ├── database/
    ├── models/
    ├── schemas/
    └── services/
    └── utils/
```

```
backend/
├── main.py                     # Точка входа: FastAPI app + lifespan
├── core/
│   ├── config.py               # Настройки через Pydantic Settings (.env)
│   └── security.py             # JWT, хеширование, шифрование паролей
├── database/
│   └── session.py              # Async SQLAlchemy engine, session, Base
├── models/                     # SQLAlchemy ORM-модели
│   ├── __init__.py
│   ├── base_mixin.py           # Миксин для created_at / updated_at
│   ├── user.py                 # Пользователи системы (внутренние)
│   ├── db.py                   # Подключения к внешним БД, их пользователи/группы
│   └── agreement.py            # Пользовательские соглашения
├── schemas/                    # Pydantic-схемы (валидация, сериализация)
│   ├── app_users_schemas.py
│   ├── app_agreements_schemas.py
│   ├── db_connections_schemas.py
│   ├── db_users_schemas.py
│   ├── db_groups_schemas.py
│   ├── db_schemas_schemas.py
│   ├── db_tables_schemas.py
│   ├── db_views_schemas.py
│   ├── db_indexes_schemas.py
│   ├── db_functions_schemas.py
│   ├── db_procedures_schemas.py
│   └── db_metrics_schemas.py
├── services/                   # Бизнес-логика (сервисный слой)
│   ├── app_users_services.py
│   ├── app_agreements_services.py
│   ├── db_connections_services.py
│   ├── db_users_services.py
│   ├── db_groups_services.py
│   ├── db_schemas_services.py
│   ├── db_tables_services.py
│   ├── db_views_services.py
│   ├── db_indexes_services.py
│   ├── db_functions_services.py
│   ├── db_procedures_services.py
│   └── db_metrics_services.py
├── api/
│   └── v1/                     # Версионированные маршруты
│       ├── __init__.py
│       ├── app_auth.py         # Аутентификация (JWT, login/logout)
│       ├── app_users.py        # Управление внутренними пользователями
│       ├── app_agreements.py   # Соглашения
│       ├── db_connections.py   # Подключения к внешним БД
│       ├── db_users.py         # Пользователи во внешних БД
│       ├── db_groups.py        # Группы во внешних БД
│       ├── db_schemas.py       # Схемы + управление привилегиями (пользователи/группы)
│       ├── db_tables.py        # Таблицы + права (SELECT, INSERT, ...)
│       ├── db_views.py         # Представления и материализованные представления
│       ├── db_indexes.py       # Индексы
│       ├── db_functions.py     # Функции (PostgreSQL)
│       ├── db_procedures.py    # Процедуры
│       └── db_metrics.py       # Метрики и настройки БД (включая Greenplum)
└── utils/
    └── external_db.py          # Утилиты для подключения к внешним БД (asyncpg)
```

<h3 style="color: #2486b5; text-align: center">
Установка зависимостей
</h3>
- В папке проекта DB_HUB создайте файл .env

```
# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=db_hub
DB_USER=postgres
DB_PASSWORD=your_password

# APP
ENCRYPTION_KEY=your_32_byte_base64_encryption_key

# JWT / Security
SECRET_KEY=your-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# FastAPI
HOST=127.0.0.1
PORT=8000
```

- Создайте свой ключ (ENCRYPTION_KEY) для backend приложения

```bash
python3 backend/generate_app_key.py 
```

- Установите зависимости requirements.txt

```bash
pip install -r requirements.txt
```

- Создание requirements.txt из текущего окружения

```bash
pip freeze > requirements.txt
```

- Проверить устаревшие пакеты

```bash
pip list --outdated
```

- Получение всего backend кода в один файл - all_code.txt

```bash
python3 backend/collect_app_code.py 
```

- Очистка кэш Python

```bash
python -c "import sys; sys.path_importer_cache.clear()"
```

<h3 style="color: #2486b5; text-align: center">
Запуск backend приложения DB_HUB
</h3>

```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```


<h3 style="color: #24b59a; text-align: center">
Запуск frontend приложения DB_HUB
</h3>

```bash
cd frontend
```
```bash
npm start
```
