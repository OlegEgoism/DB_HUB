from typing import List, Dict, Any
import asyncpg
from backend.core.security import decrypt_password
from backend.models.db import Connection


class DBMetricsService:
    """Сервис для получения метрик базы данных"""

    @staticmethod
    async def get_database_metrics(connection: Connection) -> List[Dict[str, Any]]:
        metrics: List[Dict[str, Any]] = []
        try:
            password = decrypt_password(connection.password)
            conn = await asyncpg.connect(
                host=connection.host,
                port=connection.port,
                user=connection.username,
                password=password,
                database=connection.database_name,
                timeout=10,
            )
            sql_query = """
            SELECT 'db_size' AS metric, pg_size_pretty(pg_database_size(current_database())) AS value
            UNION ALL
            SELECT 'count_table', COUNT(*)::TEXT
            FROM information_schema.tables 
            WHERE table_schema NOT IN ('information_schema', 'pg_catalog') AND table_type = 'BASE TABLE'
            UNION ALL
            SELECT 'all_size_table', pg_size_pretty(COALESCE(SUM(pg_total_relation_size(quote_ident(schemaname) || '.' || quote_ident(tablename))), 0))
            FROM pg_tables
            WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
            UNION ALL
            SELECT 'system_table_count', COUNT(*)::TEXT
            FROM information_schema.tables 
            WHERE table_schema IN ('pg_catalog', 'information_schema') AND table_type = 'BASE TABLE'
            UNION ALL
            SELECT 'system_table_total_size', pg_size_pretty(COALESCE(SUM(pg_total_relation_size(quote_ident(schemaname) || '.' || quote_ident(tablename))), 0))
            FROM pg_tables
            WHERE schemaname IN ('pg_catalog', 'information_schema')
            UNION ALL
            SELECT 'temp_table_count', COUNT(*)::TEXT
            FROM pg_class
            WHERE relpersistence = 't'
            UNION ALL
            SELECT 'temp_table_size', pg_size_pretty(COALESCE(SUM(pg_relation_size(oid)), 0))
            FROM pg_class
            WHERE relpersistence = 't'
            UNION ALL
            SELECT 'total_users', COUNT(*)::TEXT FROM pg_user
            UNION ALL
            SELECT 'active_users', COUNT(DISTINCT usename)::TEXT
            FROM pg_stat_activity 
            WHERE pid <> pg_backend_pid() AND state IS NOT NULL
            UNION ALL
            SELECT 'role_count', COUNT(*)::TEXT
            FROM pg_roles 
            WHERE rolname NOT LIKE 'pg\_%'
            UNION ALL
            SELECT 'max_connections', setting
            FROM pg_settings 
            WHERE name = 'max_connections'
            UNION ALL
            SELECT 'current_connections', COUNT(*)::TEXT
            FROM pg_stat_activity 
            WHERE state IS NOT NULL
            UNION ALL
            SELECT 'index_count', COUNT(*)::TEXT
            FROM pg_indexes
            WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
            UNION ALL
            SELECT 'view_count', COUNT(*)::TEXT
            FROM information_schema.views 
            WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
            UNION ALL
            SELECT 'materialized_view_count', COUNT(*)::TEXT
            FROM pg_class
            WHERE relkind = 'm'
            UNION ALL
            SELECT 'procedure_count', COUNT(*)::TEXT
            FROM information_schema.routines 
            WHERE routine_schema NOT IN ('information_schema', 'pg_catalog') AND routine_type = 'PROCEDURE'
            UNION ALL
            SELECT 'trigger_count', COUNT(*)::TEXT
            FROM information_schema.triggers 
            WHERE trigger_schema NOT IN ('information_schema', 'pg_catalog')
            UNION ALL
            SELECT 'postgresql_version', version()
            UNION ALL
            SELECT 'default_encoding', pg_encoding_to_char(encoding)
            FROM pg_database WHERE datname = current_database()
            UNION ALL
            SELECT 'collation', datcollate
            FROM pg_database WHERE datname = current_database()
            UNION ALL
            SELECT 'uptime', (EXTRACT(EPOCH FROM (current_timestamp - pg_postmaster_start_time())) / 3600)::INT || ' hours'
            UNION ALL
            SELECT 'start_time', TO_CHAR(pg_postmaster_start_time(), 'DD.MM.YYYY HH24:MI:SS')
            """
            rows = await conn.fetch(sql_query)
            for row in rows:
                metrics.append(
                    {
                        "metric": row["metric"],
                        "value": row["value"],
                    }
                )
            await conn.close()
            return metrics
        except Exception as e:
            return [{"metric": "connection_error", "value": str(e), }]

    @staticmethod
    async def get_cluster_replication_info(connection: Connection, ) -> List[Dict[str, Any]]:
        """Кластеризация и репликация"""
        try:
            password = decrypt_password(connection.password)
            conn = await asyncpg.connect(
                host=connection.host,
                port=connection.port,
                user=connection.username,
                password=password,
                database=connection.database_name,
                timeout=10,
            )
            sql_query = """
               WITH gp_available AS (
                   SELECT 1
                   FROM pg_catalog.pg_class c
                   JOIN pg_catalog.pg_namespace n
                       ON n.oid = c.relnamespace
                   WHERE c.relname = 'gp_segment_configuration'
                     AND n.nspname = 'pg_catalog'
               ),
               db_ip AS (
                   SELECT
                       'DB' AS node_type,
                       'coordinator' AS node_role,
                       inet_server_addr()::text AS ip_address
                   WHERE inet_server_addr() IS NOT NULL
               ),
               segments_ip AS (
                   SELECT
                       'SEGMENT' AS node_type,
                       CASE
                           WHEN role = 'p' THEN 'primary'
                           WHEN role = 'm' THEN 'mirror'
                       END AS node_role,
                       address AS ip_address
                   FROM gp_segment_configuration
                   WHERE EXISTS (SELECT 1 FROM gp_available)
                     AND content >= 0
               ),
               all_nodes AS (
                   SELECT node_type, node_role, ip_address FROM db_ip
                   UNION ALL
                   SELECT node_type, node_role, ip_address FROM segments_ip
               )
               SELECT
                   node_type,
                   node_role,
                   COUNT(*)::INT AS count
               FROM all_nodes
               GROUP BY node_type, node_role
               ORDER BY node_type, node_role;
               """
            rows = await conn.fetch(sql_query)
            await conn.close()
            return [
                {
                    "node_type": row["node_type"],
                    "node_role": row["node_role"],
                    "count": row["count"],
                }
                for row in rows
            ]
        except Exception:
            return []

    @staticmethod
    async def get_cluster_health(connection: Connection) -> Dict[str, Any]:
        """Проверка состояния кластера"""
        try:
            password = decrypt_password(connection.password)
            conn = await asyncpg.connect(
                host=connection.host,
                port=connection.port,
                user=connection.username,
                password=password,
                database=connection.database_name,
                timeout=10,
            )
            sql_query = """
                WITH gp_available AS (
                    SELECT 1
                    FROM pg_catalog.pg_class c
                    JOIN pg_catalog.pg_namespace n
                        ON n.oid = c.relnamespace
                    WHERE c.relname = 'gp_segment_configuration'
                      AND n.nspname = 'pg_catalog'
                )
                SELECT 
                    'Здоровье кластера' AS check_name,
                    CASE 
                        WHEN COUNT(*) = SUM(CASE WHEN status = 'u' THEN 1 ELSE 0 END)
                         AND COUNT(*) = SUM(CASE WHEN mode = 's' THEN 1 ELSE 0 END)
                        THEN '✅ Все сегменты вверх и синхронизированы'
                        WHEN COUNT(*) > SUM(CASE WHEN status = 'u' THEN 1 ELSE 0 END)
                        THEN '⚠ Есть проблемы: ' ||
                             (COUNT(*) - SUM(CASE WHEN status = 'u' THEN 1 ELSE 0 END)) ||
                             ' сегментов не вверх'
                        ELSE '❌ Критические проблемы'
                    END AS status
                FROM gp_segment_configuration
                WHERE EXISTS (SELECT 1 FROM gp_available)
                  AND content != -1;
                """
            row = await conn.fetchrow(sql_query)
            await conn.close()
            if not row:
                return {"check_name": "Здоровье кластера", "status": "not_supported", }
            return {"check_name": row["check_name"], "status": row["status"], }
        except Exception:
            return {"check_name": "Здоровье кластера", "status": "not_supported", }

    # backend/services/db_metrics_service.py - обновите метод get_active_connections

    @staticmethod
    async def get_active_connections(connection: Connection) -> List[Dict[str, Any]]:
        """Получить активные подключения к базе данных"""
        try:
            password = decrypt_password(connection.password)
            conn = await asyncpg.connect(
                host=connection.host,
                port=connection.port,
                user=connection.username,
                password=password,
                database=connection.database_name,
                timeout=10,
            )

            sql_query = """
            SELECT 
                usename as username,
                COALESCE(client_addr::text, 'localhost') as host,
                COALESCE(state, 'idle') as command,
                CASE 
                    WHEN state_change IS NOT NULL 
                    THEN EXTRACT(EPOCH FROM (now() - state_change))::INT || ' сек'
                    ELSE 'N/A'
                END as duration,
                CASE 
                    WHEN state = 'active' THEN 'Активно'
                    WHEN state = 'idle' THEN 'Ожидание'
                    WHEN state = 'idle in transaction' THEN 'Ожидание в транзакции'
                    WHEN state = 'idle in transaction (aborted)' THEN 'Ожидание в транзакции (прервано)'
                    WHEN state = 'fastpath function call' THEN 'Быстрый вызов функции'
                    WHEN state = 'disabled' THEN 'Отключено'
                    ELSE COALESCE(state, 'Неизвестно')
                END as status,
                COALESCE(
                    CASE 
                        WHEN query IS NOT NULL AND query != '' THEN 
                            LEFT(query, 50) || CASE WHEN LENGTH(query) > 50 THEN '...' ELSE '' END
                        WHEN application_name IS NOT NULL AND application_name != '' THEN 
                            'Приложение: ' || application_name
                        WHEN wait_event_type IS NOT NULL THEN 
                            'Ожидание: ' || wait_event_type
                        ELSE 'Бездействует'
                    END,
                    'Нет информации'
                ) as info,
                pid as process_id,
                datname as database_name,
                backend_start as connection_start_time,
                COALESCE(application_name, 'Не указано') as application_name
            FROM pg_stat_activity 
            WHERE pid <> pg_backend_pid()
            ORDER BY 
                CASE 
                    WHEN state = 'active' THEN 1
                    WHEN state = 'idle in transaction' THEN 2
                    WHEN state = 'idle in transaction (aborted)' THEN 3
                    WHEN state = 'idle' THEN 4
                    ELSE 5
                END,
                state_change ASC NULLS LAST
            LIMIT 100;
            """

            rows = await conn.fetch(sql_query)
            await conn.close()

            # Получаем общее количество подключений отдельным запросом
            total_conn = await conn.fetchval(
                "SELECT COUNT(*) FROM pg_stat_activity WHERE pid <> pg_backend_pid()"
            )

            active_connections = []
            for row in rows:
                active_connections.append({
                    "user": row["username"] or "Неизвестно",
                    "host": row["host"],
                    "command": row["command"],
                    "duration": row["duration"],
                    "status": row["status"],
                    "info": row["info"],
                    "process_id": row["process_id"],
                    "database": row["database_name"],
                    "connection_start": row["connection_start_time"].isoformat() if row["connection_start_time"] else None,
                    "application": row["application_name"]
                })

            # Добавляем total_connections в первый элемент
            if active_connections:
                active_connections[0]["total_connections"] = total_conn
            else:
                # Если нет активных подключений кроме текущего
                active_connections.append({
                    "user": "Нет активных подключений",
                    "host": "",
                    "command": "",
                    "duration": "",
                    "status": "",
                    "info": "Только текущее подключение",
                    "process_id": 0,
                    "database": connection.database_name,
                    "connection_start": None,
                    "application": "",
                    "total_connections": 0
                })

            return active_connections

        except Exception as e:
            return [{"error": f"Ошибка получения активных подключений: {str(e)}"}]