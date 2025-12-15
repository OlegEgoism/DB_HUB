# HUB DB

---------

- Версия: Python 3.13 / PostgreSQL 13+ / Greenplum 6+
- При первом запуске приложения все таблицы будут созданы автоматически/
- API документация: - http://127.0.0.1:8000/docs - http://127.0.0.1:8000/redoc

---------

# Получение всего backend кода в один файл - all_code.txt

````bash
python3 backend/collect_app_code.py 
````

---------

- В папке backend создайте файл .env

````
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
````

- Ключ шифрования для backend приложения

````bash
python3 backend/generate_app_key.py 
````

- Установите зависимости requirements.txt

````bash
pip install -r requirements.txt
````

- Создание requirements.txt из текущего окружения

````bash
pip freeze > requirements.txt
````

- Проверить устаревшие пакеты

````bash
pip list --outdated
````

---------

# Запуск бэкенд приложения

- Запуск напрямую

````bash
python backend/main.py
````

- Запуск через uvicorn (рекомендуется для разработки)

````bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
````


