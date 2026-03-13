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
python3 backend/collect_backend.py 
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

- Узнать, какие файлы изменились

```bash
git diff --name-only
```

<h3 style="color: #2486b5; text-align: center">
Запуск backend приложения DB_HUB
</h3>

- При первом запуске приложения все таблицы будут созданы автоматически
- http://127.0.0.1:8000/docs
- http://127.0.0.1:8000/redoc

```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

<h3 style="color: #24b59a; text-align: center">
Запуск frontend приложения DB_HUB
</h3>

- Установите все необходимые зависимости

```bash
cd frontend
```

```bash
npm install
```

- Запуск frontend приложения DB_HUB
```bash
npm run dev
```



<h3 style="color: #f39c12; text-align: center">
Запуск DB HUB в Docker (полный вариант)
</h3>

Ниже — пошаговая инструкция, как **собрать и запустить проект через Docker**.

### 1) Проверить, что Docker установлен

```bash
docker --version
docker compose version
```

Если команды не найдены — установите Docker Desktop (Windows/macOS) или Docker Engine + Docker Compose Plugin (Linux).

### 2) Создать и заполнить `.env` в корне проекта

Минимальный пример:

```env
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

# FastAPI (для локального запуска без Docker)
HOST=127.0.0.1
PORT=8000
```

> В Docker Compose БД для backend берется по имени сервиса `db` (это уже задано в `docker-compose.yml`).
> Для frontend в Docker уже задан `VITE_API_BASE_URL=http://localhost:8088`.

### 3) Собрать и поднять контейнеры

Из корня проекта выполните:

```bash
docker compose up --build -d
```

Будут подняты сервисы:
- `db` (PostgreSQL)
- `backend` (FastAPI) → `http://localhost:8088`
- `frontend` (Vite) → `http://localhost:8099`

### 4) Проверить, что всё запустилось

```bash
docker compose ps
```

Посмотреть логи backend:

```bash
docker compose logs -f backend
```

Посмотреть логи БД:

```bash
docker compose logs -f db
```

### 5) Открыть приложение

- Frontend: http://localhost:8099
- Swagger: http://localhost:8088/docs
- ReDoc: http://localhost:8088/redoc
- API base: http://localhost:8088/api/v1

### 6) Автоматическое создание пользователя `admin`

При запуске контейнера backend автоматически:
1. создаются таблицы (если их нет),
2. создается пользователь `admin` (если еще не существует).

Поля и значения пользователя:

- `username`: `admin`
- `email`: `admin@admin.com`
- `hashed_password`: `$2b$12$4X9Y9CEdbYwO7PkItheV7eqfYlVj435cPIWSZOjDP2.MCFwPNBcyK`
- `fio`: `admin`
- `is_active`: `true`
- `is_superuser`: `true`
- `role`: `Администратор БД`
- `last_login`: `null`
- `refresh_token`: `null`
- `created_at`: `2026-03-13 23:43:52.972 +0300`
- `updated_at`: `2026-03-13 23:44:09.549 +0300`

### 7) Остановить контейнеры

```bash
docker compose down
```

С удалением тома БД (полный сброс данных):

```bash
docker compose down -v
```

### Проблема `failed to bind host port 0.0.0.0:5432`

Если на хосте уже занят порт `5432` (локальный PostgreSQL), Docker не сможет поднять сервис `db`.
Поэтому в текущем `docker-compose.yml` порт БД наружу по умолчанию не публикуется.

Если нужен доступ к БД с хоста, включите публикацию порта в `docker-compose.yml` и используйте, например, `5433:5432`.

### Если `docker compose ps` показывает пусто

Чаще всего это происходит, если команды запускались в разных контекстах (`sudo docker ...` и `docker ...` без sudo).
Используйте один и тот же способ для всех команд:

```bash
sudo docker compose up -d --build
sudo docker compose ps
sudo docker compose logs -f backend
```

### Если backend падает при старте

- В проекте добавлены повторные попытки подключения к БД при старте FastAPI, чтобы пережить задержку DNS/готовности postgres внутри Docker-сети.
- Проверка логов:

```bash
sudo docker compose logs --tail=200 db
sudo docker compose logs --tail=200 backend
```

### Что добавлено для Docker

- `docker-compose.yml` — оркестрация `db` + `backend` + `frontend`.
- `Dockerfile.backend` — контейнер FastAPI.
- `Dockerfile.frontend` — запуск фронтенда через Vite dev server в контейнере.
- `nginx.conf` — сохранен в репозитории, но в текущей Docker-схеме не используется.
- `.dockerignore` — исключение лишних файлов из контекста сборки.
