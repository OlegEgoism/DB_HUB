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

## Документация проекта

- Полный аудит проекта и эталонная структура документации: `docs/PROJECT_ANALYSIS_AND_DOCUMENTATION.md`

## Установка зависимостей

- Файл `.env` **не обязателен** для базового локального запуска (используются значения по умолчанию).
- Если хотите переопределить настройки — создайте `.env` в корне проекта:

```
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
pip install -r backend/requirements.txt
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
npm --prefix frontend install
```

- Запуск frontend приложения DB_HUB

```bash
npm --prefix frontend run dev
```

## Запуск DB HUB в Docker (один контейнер приложения)

Теперь стандартный `docker-compose.yml` запускает **одно цельное приложение** в контейнере `db_hub_app`:

- frontend (Vite) — `http://localhost:8099`
- backend (FastAPI) — `http://localhost:8088`
- SQLite БД — файл `/app/data/db_hub.sqlite3` внутри контейнера (сохранение через volume)

### Подготовка

> В Docker Compose БД для backend берется по имени сервиса `db` (это уже задано в `docker-compose.yml`).
> backend `http://localhost:8088/docs` или `http://0.0.0.0:8088/docs`.
> frontend `http://localhost:8099` или `http://0.0.0.0:8099`.

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
В проекте добавлена автоматическая подмена `localhost/127.0.0.1/::1/0.0.0.0` на список хостов:
1. `host.docker.internal`
2. `172.17.0.1` (резервный bridge IP для Linux)

Подмена по умолчанию включается только в Docker.
При необходимости можно принудительно управлять через `DBHUB_MAP_LOCALHOST_TO_HOST` (`1`/`0`).

Для Linux в compose добавлен `extra_hosts: host.docker.internal:host-gateway`,
поэтому подключение к БД на хост-машине работает через `host.docker.internal`.

Важно: на локальном PostgreSQL/Greenplum должны быть разрешены внешние подключения
(`listen_addresses`, `pg_hba.conf`) для docker-сети.

В качестве `host` лучше указывать `localhost` (или IP хоста), `0.0.0.0` поддержан как совместимость.

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

## Docker Hub релиз (новый поток для нового проекта)

Для публикации подготовлены отдельные production-oriented файлы:

- `Dockerfile.fullstack.prod`
- `docker-compose.hub.yml`
- `docs/DOCKER_HUB_DEPLOYMENT.md`

Сборка и публикация:

```bash
docker login -u olegegoism
docker build -f Dockerfile.fullstack.prod -t olegegoism/db-hub:latest .
docker build -f Dockerfile.fullstack.prod -t olegegoism/db-hub:v1.0.0 .
docker push olegegoism/db-hub:latest
docker push olegegoism/db-hub:v1.0.0
```


### Если локальная БД слушает только `127.0.0.1` (Linux)

В этом случае bridge-сеть Docker может не подойти, и подключение к `localhost` из контейнера будет падать.
Используйте режим host-network:

```bash
docker compose -f docker-compose.hostnet.yml up --build -d
```

В этом режиме контейнер использует сеть хоста, поэтому `localhost` в настройке подключения
указывает на локальную БД хост-машины напрямую.
