# DB HUB

Веб-приложение: управление подключениями к **PostgreSQL / Greenplum**, просмотр объектов БД, метрики, работа с пользователями и группами на сервере БД, выполнение запросов.

**Документация:**

- [Архитектура и состав API](docs/PROJECT.md)
- [Сборка образа и Docker Hub](docs/DOCKER_HUB_DEPLOYMENT.md)

## Структура репозитория

```
DB_HUB/
├── backend/      # FastAPI, SQLite, клиент к внешним БД
├── frontend/     # React + Vite (FSD)
├── docs/         # Доп. документация
├── scripts/      # Стартовые скрипты для Docker fullstack
└── docker-compose*.yml
```

## Локальный запуск backend

Файл `.env` **не обязателен** — используются значения по умолчанию из `backend/core/config.py`. Для production задайте свои `SECRET_KEY` и `ENCRYPTION_KEY`.

Пример переопределения (корень репозитория):

```env
ENCRYPTION_KEY=<ваш_32_байт_url-safe_base64>
SECRET_KEY=<случайная_строка>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
HOST=127.0.0.1
PORT=8000
```

Сгенерировать ключ шифрования:

```bash
python3 backend/generate_app_key.py
```

Установка зависимостей:

```bash
pip install -r backend/requirements.txt
```

При первом запуске создаются таблицы SQLite и пользователь **`admin`** (пароль **`admin1234`**, если записи ещё нет). Смените пароль после входа.

Запуск:

```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

- OpenAPI: http://127.0.0.1:8000/docs  
- ReDoc: http://127.0.0.1:8000/redoc  

## Локальный запуск frontend

Требуется Node.js (см. `frontend/README.md`).

```bash
npm install --prefix .\frontend
npm run dev --prefix .\frontend
```

## Линтинг Python (Ruff)

Конфигурация: `backend/pyproject.toml`. Из корня репозитория:

```bash
ruff check backend
ruff check backend --fix
ruff format backend
```

## Docker: одно приложение (dev-образ `Dockerfile.fullstack`)

В контейнере `db_hub_app`: backend (порт **8088**), frontend Vite dev (**8099**), SQLite в volume `/app/data`.

```bash
docker compose up --build -d
```

Проверка и логи:

```bash
docker compose ps
docker compose logs -f app
```

Остановка:

```bash
docker compose down
```

Тот же сценарий явным файлом:

```bash
docker compose -f docker-compose.fullstack.yml up --build -d
```

При старте выполняется `backend.docker_init` (таблицы и `admin` при необходимости). Отдельный контейнер PostgreSQL для метаданных приложения **не нужен**.

### Подключение из контейнера к БД на хосте (Linux)

Если в форме указан `host=localhost`, внутри Docker это контейнер. Включена подмена на `host.docker.internal` / резервный bridge IP (`DBHUB_MAP_LOCALHOST_TO_HOST`, см. `backend/utils/external_db.py`). В compose добавлен `extra_hosts: host.docker.internal:host-gateway`. На стороне PostgreSQL/Greenplum должны быть открыты `listen_addresses` и `pg_hba.conf` для сети Docker.

Если БД слушает только `127.0.0.1` и bridge не подходит:

```bash
docker compose -f docker-compose.hostnet.yml up --build -d
```

## Docker Hub / production-сборка

Сборка статического frontend и `vite preview` + uvicorn в одном контейнере: `Dockerfile.fullstack.prod`, `docker-compose.hub.yml`, инструкция в [docs/DOCKER_HUB_DEPLOYMENT.md](docs/DOCKER_HUB_DEPLOYMENT.md).

Пример публикации (подставьте свой namespace):

```bash
docker login -u olegegoism
docker build -f Dockerfile.fullstack -t olegegoism/db-hub:latest .
docker push olegegoism/db-hub:latest
```

`VITE_API_BASE_URL` задаётся на этапе **build** образа (`ARG` в `Dockerfile.fullstack.prod` / `docker-compose.hub.yml`).


docker exec -it db-hub getent hosts host.docker.internal
docker exec -it db-hub sh -c "nc -zv host.docker.internal 5432"