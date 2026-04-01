# DB HUB — Docker Hub и production fullstack-образ

## Файлы

| Файл | Назначение |
|------|------------|
| `Dockerfile.fullstack` | Dev: Vite dev + uvicorn в одном контейнере |
| `Dockerfile.fullstack.prod` | Сборка `npm run build`, затем uvicorn + `vite preview` |
| `scripts/start_fullstack_prod.sh` | Инициализация БД (`backend.docker_init`), параллельный запуск backend и preview |
| `docker-compose.hub.yml` | Запуск собранного prod-образа; переменные в `environment`, без обязательного `.env` |

## Сборка и push

```bash
docker login -u <dockerhub_user>

docker build -f Dockerfile.fullstack.prod -t <dockerhub_user>/db-hub:latest .
docker build -f Dockerfile.fullstack.prod -t <dockerhub_user>/db-hub:v1.0.0 .

docker push <dockerhub_user>/db-hub:latest
docker push <dockerhub_user>/db-hub:v1.0.0
```

При другом URL API измените `VITE_API_BASE_URL` (build-arg в `docker-compose.hub.yml` или `docker build --build-arg VITE_API_BASE_URL=...`).

## Локальная проверка compose

```bash
docker compose -f docker-compose.hub.yml up --build -d
docker compose -f docker-compose.hub.yml ps
docker compose -f docker-compose.hub.yml logs -f app
```

## Замечания по эксплуатации

- Для продакшена передавайте `SECRET_KEY` и `ENCRYPTION_KEY` через секреты оркестратора, не оставляйте значения по умолчанию из примеров.
- Дальнейшее развитие: разнести backend и статический frontend (nginx) по отдельным контейнерам и добавить CI (например, GitHub Actions) с тегами по git.
