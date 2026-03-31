# DB HUB — полный анализ проекта и эталон документации

> Дата ревизии: 30 марта 2026.

## 1) Краткий вывод

Проект уже имеет рабочую основу fullstack-приложения:

- **Backend:** FastAPI + SQLAlchemy (async), JWT-аутентификация, разделение на `api / services / schemas / models`.
- **Frontend:** React + TypeScript + Vite, структура в стиле FSD (app/pages/widgets/features/entities/shared).
- **Деплой:** docker-compose, полнофункциональный single-container режим (frontend + backend + SQLite volume).

Ключевая проблема — **недостаточная единая документация по архитектуре и эксплуатационным практикам**. Этот документ закрывает этот пробел и формирует «правильный» базовый стандарт.

---

## 2) Карта проекта

```text
DB_HUB/
├── backend/
│   ├── api/v1/                  # HTTP endpoints
│   ├── services/                # Бизнес-логика и работа с БД
│   ├── schemas/                 # Pydantic-схемы запросов/ответов
│   ├── models/                  # SQLAlchemy-модели app БД
│   ├── core/                    # Конфиг, безопасность, лимитер
│   ├── database/session.py      # Engine/session dependency
│   └── main.py                  # Точка входа FastAPI
├── frontend/
│   └── src/
│       ├── app/                 # роутинг, root/layout
│       ├── pages/               # страницы
│       ├── widgets/             # крупные UI-блоки
│       ├── features/            # пользовательские сценарии
│       ├── entities/            # доменные сущности
│       └── shared/              # API/утилиты/конфиги/стили
├── docker-compose.yml           # основной fullstack запуск
├── Dockerfile.fullstack         # единый образ
└── docs/                        # документация проекта
```

---

## 3) Технический анализ backend

## 3.1 Архитектура

Сильные стороны:

1. **Явное разделение слоёв** (`api`, `services`, `schemas`, `models`).
2. **Async stack** для API и SQLAlchemy-сессий.
3. **Rate limiting** через `slowapi`.
4. **Пагинация** как повторно используемый подход в утилитах.

Риски и замечания:

1. **Бизнес-правила и SQL частично «смешаны» в сервисах** (особенно в модулях привилегий/каталогов) — сложно тестировать точечно.
2. **Логирование и обработка ошибок** локально консистентны, но нет единого форматированного стандарта (например, structured logging).
3. **Отсутствуют автотесты** (unit/integration) как обязательный quality gate.

## 3.2 API-поверхность

API агрегируется через `/api/v1` и покрывает ключевые домены:

- `app_auth`, `app_users`, `app_settings`.
- `db_connections`, `db_metrics`, `db_groups`, `db_users`.
- `db_schemas`, `db_tables`, `db_views`, `db_indexes`, `db_functions`, `db_procedures`, `db_query`.

Это хороший базовый охват DBA-задач (подключения, пользователи, группы, объекты БД, метрики, операции).

## 3.3 Конфигурация и безопасность

- Конфиг через `pydantic-settings` и `.env`.
- Поддержан `ENCRYPTION_KEY` и JWT-настройки.
- По умолчанию CORS открыт (`*`) — удобно для разработки, но для production нужен allowlist.

Рекомендация:

- Вынести production-профиль (CORS, cookies, secure headers, trusted hosts) в отдельный конфиг-слой.

---

## 4) Технический анализ frontend

## 4.1 Архитектура

Сильные стороны:

1. **FSD-подобная структура** и разбиение ответственности.
2. Единый HTTP-клиент в `shared/api/http.ts`.
3. Реалистичная предметная декомпозиция для сложной страницы `connections/detail`.

Риски:

1. **Крупные компоненты (особенно detail-page)** усложняют поддержку.
2. Наблюдаются предупреждения React hooks (`exhaustive-deps`) — потенциальный источник нестабильного состояния.

## 4.2 Маршрутизация

Роутинг централизован через `app/routes.ts` и включает:

- `/` (home)
- `/connections`, `/connections/:id`
- `/users`, `/profile`, `/settings`
- `/login`
- `*` (not-found)

---

## 5) Эксплуатация и запуск

## 5.1 Локально

- Backend: `uvicorn backend.main:app --reload`
- Frontend: `npm --prefix frontend run dev`

## 5.2 Docker

Основной путь — `docker-compose.yml` (единый контейнер fullstack + sqlite volume).

Порты по умолчанию:

- backend: `8088`
- frontend: `8099`

---

## 6) Quality gates (рекомендуемый минимум)

Для каждого PR:

1. `ruff check backend`
2. `ruff format backend` (или общий форматтер по регламенту)
3. `npm --prefix frontend run lint`
4. `npm --prefix frontend run build`
5. smoke-тест API (`/docs` доступен, auth login работает)

Рекомендуется добавить CI (GitHub Actions/GitLab CI) с этими шагами.

---

## 7) «Правильная документация» для этого проекта

Ниже — эталонный набор документации, который должен поддерживаться в актуальном виде.

## 7.1 Обязательные документы

1. **README.md (корневой)**
   - Что это за продукт и для кого.
   - Быстрый старт (локально/в Docker).
   - Ссылки на API docs (`/docs`, `/redoc`).
   - Ссылки на расширенную документацию в `docs/`.

2. **docs/ARCHITECTURE.md**
   - Слои backend и frontend.
   - Границы ответственности модулей.
   - Потоки данных (auth, CRUD, внешние подключения).

3. **docs/API_CONTRACT.md**
   - Доменные разделы API.
   - Стандарты кодов ошибок, формат ошибок.
   - Правила версионирования и депрекейта.

4. **docs/DEPLOYMENT.md**
   - Docker-профили.
   - Переменные окружения.
   - Рекомендации для production.

5. **docs/CONTRIBUTING.md**
   - Стиль кода, ветки, коммиты.
   - Минимальный набор проверок перед PR.

6. **docs/TESTING.md**
   - Стратегия тестирования.
   - Что покрывается unit/integration/e2e.

## 7.2 Стандарт раздела «переменные окружения»

Для каждой переменной должны быть:

- `Название`
- `Default`
- `Required (yes/no)`
- `Пример`
- `Описание`
- `Security note`

## 7.3 Стандарт описания endpoint

Для каждого endpoint:

- Метод и путь
- Назначение
- Авторизация
- Query/path/body параметры
- Пример успешного ответа
- Примеры ошибок (4xx/5xx)

---

## 8) Приоритетный план улучшений

### P0 (сразу)

1. Включить CI с lint/build/check.
2. Ввести единый шаблон error-response в API.
3. Ограничить CORS для production-контура.

### P1 (ближайший спринт)

1. Разбить крупные frontend-компоненты на более мелкие.
2. Добавить unit/integration тесты backend-сервисов.
3. Добавить smoke e2e для ключевых пользовательских сценариев.

### P2 (планово)

1. Миграции schema-management (если ещё не стандартизовано).
2. Structured logging + correlation id.
3. Нормализовать слой доступа к внешним БД (единые адаптеры и политики retry/timeout).

---

## 9) Definition of Done для документации

Документация считается «в порядке», если:

1. README позволяет новому разработчику поднять проект без устных пояснений.
2. Для каждого домена API есть актуальная схема запросов/ответов.
3. Любая переменная окружения объяснена и снабжена примером.
4. Все quality gates запускаются одной командой или CI-пайплайном.

