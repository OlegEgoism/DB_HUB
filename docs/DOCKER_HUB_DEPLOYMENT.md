# DB HUB — Deep Docker Analysis & Docker Hub Release Guide

## 1) Текущее состояние и риски

### Что было найдено
- `Dockerfile.fullstack` запускает frontend через `vite dev`, что является dev-режимом (HMR/пересборки), а не production runtime.
- `docker-compose.fullstack.yml` ссылается на `env_file: .env`, что создаёт лишнюю зависимость от локального файла для старта контейнера.
- В репозитории уже есть fallback-настройки backend, но для Docker Hub релиза полезно иметь отдельный production-oriented набор файлов.

### К чему это приводит
- Образ в Docker Hub можно собрать и запустить, но поведение ближе к dev-сценарию.
- Для нового проекта/чистой машины запуск усложняется из-за ожидания `.env`.

## 2) Что изменено для нового Docker Hub workflow

Добавлены новые файлы для publish-потока:

1. `Dockerfile.fullstack.prod`
   - Собирает frontend (`npm run build`) на этапе build.
   - Поднимает backend (`uvicorn`) и frontend в режиме preview (`vite preview`) в одном контейнере.
   - Не требует `.env` для базового старта.

2. `scripts/start_fullstack_prod.sh`
   - Инициализирует БД (`backend.docker_init`).
   - Запускает backend и frontend preview параллельно.
   - Корректно завершает оба процесса по сигналам.

3. `docker-compose.hub.yml`
   - Готовый compose для сборки/запуска образа под публикацию.
   - Все необходимые переменные заданы статически в `environment`.
   - Без `env_file`.

## 3) Как обновить Docker Hub для нового проекта

### Локально (рекомендуется)

```bash
docker login -u olegegoism

docker build -f Dockerfile.fullstack.prod -t olegegoism/db-hub:latest .
docker build -f Dockerfile.fullstack.prod -t olegegoism/db-hub:v1.0.0 .

docker push olegegoism/db-hub:latest
docker push olegegoism/db-hub:v1.0.0
```

### Локальная проверка перед push

```bash
docker compose -f docker-compose.hub.yml up --build -d
docker compose -f docker-compose.hub.yml ps
docker compose -f docker-compose.hub.yml logs -f app
```

## 4) Рекомендации на следующий шаг

- Для production-grade варианта лучше разделить backend и frontend на два контейнера (backend + nginx static).
- JWT/шифровальные ключи стоит передавать через секреты CI/CD, а не хранить статически в compose.
- Для Docker Hub релизов удобно добавить CI (GitHub Actions) с авто-тегированием по git tag.
