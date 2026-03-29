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

## Запуск DB HUB в Docker (один контейнер приложения)

Теперь стандартный `docker-compose.yml` запускает **одно цельное приложение** в контейнере `db_hub_app`:

- frontend (Vite) — `http://localhost:8099`
- backend (FastAPI) — `http://localhost:8088`
- SQLite БД — файл `/app/data/db_hub.sqlite3` внутри контейнера (сохранение через volume)

### Подготовка

В корне проекта создайте `.env` и заполните обязательные переменные приложения (`ENCRYPTION_KEY`, `SECRET_KEY` и т.д.).

### Запуск

```bash
docker compose up --build -d
```

### Проверка

```bash
docker compose ps
docker compose logs -f app
```

### Остановка

```bash
docker compose down
```


### Подключение к локальной внешней PostgreSQL/Greenplum

Если в форме нового подключения указать `host=localhost`, то внутри Docker это означает сам контейнер.
В проекте добавлена автоматическая подмена `localhost/127.0.0.1/::1` на `host.docker.internal`
(можно отключить через `DBHUB_MAP_LOCALHOST_TO_HOST=0`).

Для Linux в compose добавлен `extra_hosts: host.docker.internal:host-gateway`,
поэтому подключение к БД на хост-машине работает через `host.docker.internal`.

### Важно

При старте контейнера автоматически выполняется `python3 -m backend.docker_init`, поэтому:
1. таблицы создаются автоматически,
2. пользователь `admin` создается автоматически (если его еще нет).

> Отдельный контейнер PostgreSQL (`db_hub_db`) для этого режима **не нужен**.
> Если он уже запущен из старой схемы, остановите его через `docker compose down` в том проекте, где вы его поднимали.

## Запуск DB HUB в одном контейнере (frontend + backend + SQLite)

Этот режим эквивалентен стандартному `docker-compose.yml`.

Можно использовать и явный файл:

```bash
docker compose -f docker-compose.fullstack.yml up --build -d
```
