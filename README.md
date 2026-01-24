# DB HUB

<h3 style="color: #b52424; text-align: center">
Функционал приложения DB HUB
</h3>

```
- Управление подключениями к PostgreSQL/Greenplum.
- CRUD для пользователей и групп.
- Просмотр и управление функционалом.
- Управление привилегиями.
- Информация о метриках и настройках.
- Активные сессии, с возможностью завершать процессы.
- JWT-аутентификация, роли, соглашения.
- Поиск, пагинация, фильтрация по полям.
```

<h3 style="color: #b52424; text-align: center">
Структура приложения DB HUB
</h3>

```
DB_HUB/
├── backend/            # Бэкенд приложение
│   ├── api/
│   │   └── v1/         # Версионированные маршруты
│   ├── core/           # Настройки .env
│   ├── database/       # Настройки engine, session, Base
│   ├── models/         # ORM-модели
│   ├── schemas/        # Схемы (валидация, сериализация)
│   ├── services/       # Бизнес-логика (сервисный слой)
│   ├── utils/          # Утилиты для подключения к внешним БД
│   └── main.py         # Точка входа FastAPI DB_HUB
└── frontend/           # Фронтенд приложение
    ├── public/
    └── src/
```

<h3 style="color: #b52424; text-align: center">
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

- Создайте свой ключ (ENCRYPTION_KEY) и поместите его в .env

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

<h3 style="color: #b52424; text-align: center">
Команды Ruff
</h3>

- Проверить код на ошибки и предупреждения

```bash
ruff check .
```

- Автоматически исправить всё, что можно

```bash
ruff check . --fix
```

- Форматирование кода

```bash
ruff format .
```

<h3 style="color: #2486b5; text-align: center">
Запуск backend приложения DB_HUB
</h3>

- При первом запуске приложения все таблицы будут созданы автоматически
- API документация:
  http://127.0.0.1:8000/docs
  http://127.0.0.1:8000/redoc

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
