# DB HUB

## Функционал приложения

```
- Управление подключениями к PostgreSQL/Greenplum.
- CRUD для пользователей и групп.
- Просмотр и управление функционалом.
- Информация о метриках и настройках.
- Активные сессии, с возможностью завершать процессы.
```

## Структура приложения DB HUB

```
DB_HUB/
├── backend/            # Бэкенд приложение
└── frontend/           # Фронтенд приложение
```

## Установка зависимостей

- В папке проекта DB_HUB создайте файл .env и заполните настройки

```
# PostgreSQL
DB_HOST=...
DB_PORT=...
DB_NAME=...
DB_USER=...
DB_PASSWORD=...

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
cd backend
```

```bash
pip install -r requirements.txt
```

## Команды Ruff

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

## Запуск backend приложения

- При первом запуске приложения все таблицы в базе данных postgres будут созданы автоматически
- Создается пользователь `admin` с паролем `admin1234` (если еще не существует).
- http://127.0.0.1:8000/docs
- http://127.0.0.1:8000/redoc

```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

## Запуск frontend приложения

- Установите все необходимые зависимости

```bash
cd frontend
```

```bash
npm install
```

- Запуск frontend приложения DB_HUB

```bash
cd frontend
```

```bash
npm run dev
```

## Запуск DB HUB в Docker (полный вариант)

- Проверить, что Docker установлен

```bash
docker --version
docker compose version
```

Если команды не найдены — установите Docker Desktop (Windows/macOS) или Docker Engine + Docker Compose Plugin (Linux).

- Создать и заполнить `.env` в корне проекта

> В Docker Compose БД для backend берется по имени сервиса `db` (это уже задано в `docker-compose.yml`).
> Для frontend в Docker уже задан `VITE_API_BASE_URL=http://localhost:8088`, а сам dev-сервер frontend слушает порт `8099`.

- Собрать и поднять контейнеры

Из корня проекта выполните:

```bash
docker compose up --build -d
```

Будут подняты сервисы: `db` (PostgreSQL), `backend` (FastAPI), `frontend` (React)

Проверить, что всё запустилось

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

- При запуске контейнера backend автоматически:

1. создаются таблицы (если их нет),
2. создается пользователь `admin` с паролем `admin1234` (если еще не существует).

- Остановить контейнеры

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

### После сборки контейнера открываем браузер

- http://localhost:8099/ или http://127.0.0.1:8099
- http://localhost:8088/docs или http://127.0.0.1:8088/docs
- http://localhost:8088/redoc или http://127.0.0.1:8088/redoc