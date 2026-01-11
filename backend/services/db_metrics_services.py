# backend/services/db_metrics_services.py
from typing import List, Dict, Any
import asyncpg
from backend.core.security import decrypt_password
from backend.models.db import DB_Connection


class DBMetricsService:

    @staticmethod
    async def get_all_database_metrics(connection: DB_Connection) -> Dict[str, Any]:
        """Получить все метрики базы данных"""
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

            # Основные метрики базы данных
            basic_metrics_query = """
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
            SELECT 'temp_table_count', COUNT(*)::TEXT
            FROM pg_class
            WHERE relpersistence = 't'
            UNION ALL
            SELECT 'temp_table_size', pg_size_pretty(COALESCE(SUM(pg_relation_size(oid)), 0))
            FROM pg_class
            WHERE relpersistence = 't'
            UNION ALL
            SELECT 'system_table_count', COUNT(*)::TEXT
            FROM information_schema.tables 
            WHERE table_schema IN ('pg_catalog', 'information_schema') AND table_type = 'BASE TABLE'
            UNION ALL
            SELECT 'system_table_total_size', pg_size_pretty(COALESCE(SUM(pg_total_relation_size(quote_ident(schemaname) || '.' || quote_ident(tablename))), 0))
            FROM pg_tables
            WHERE schemaname IN ('pg_catalog', 'information_schema')
            
            UNION ALL
            SELECT 'total_users', COUNT(*)::TEXT FROM pg_user
            UNION ALL
            SELECT 'active_users', COUNT(DISTINCT usename)::TEXT
            FROM pg_stat_activity 
            WHERE pid <> pg_backend_pid() AND state IS NOT NULL
            UNION ALL
            SELECT 'superuser_count', COUNT(*)::TEXT
            FROM pg_roles 
            WHERE rolsuper = TRUE
            UNION ALL
            SELECT 'role_count', COUNT(*)::TEXT
            FROM pg_roles 
            WHERE rolname NOT LIKE 'pg\_%' AND rolcanlogin IS NOT TRUE
            UNION ALL
            SELECT 'pg_role_count', COUNT(*)::TEXT
            FROM pg_roles 
            WHERE rolname LIKE 'pg\_%' AND rolcanlogin IS NOT TRUE
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
            SELECT 'index_size', pg_size_pretty(SUM(pg_relation_size(indexrelid)))
            FROM pg_index
            WHERE indisvalid
            
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

            # Информация о кластере и репликации
            cluster_replication_query = """
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

            # Здоровье кластера
            cluster_health_query = """
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

            # Конфигурация базы данных
            database_config_query = """
            SELECT 
                name, 
                setting, 
                unit,
                category,
                short_desc as description
            FROM pg_settings
            ORDER BY name;
            """

            # Выполняем все запросы в одной транзакции
            basic_metrics = []
            cluster_info = []
            cluster_health = None
            config_parameters = []

            # Получаем базовые метрики
            rows = await conn.fetch(basic_metrics_query)
            for row in rows:
                basic_metrics.append({"metric": row["metric"], "value": row["value"], })

            # Получаем информацию о кластере
            try:
                rows = await conn.fetch(cluster_replication_query)
                for row in rows:
                    cluster_info.append({"node_type": row["node_type"], "node_role": row["node_role"], "count": row["count"], })
            except Exception:
                cluster_info = []

            # Получаем здоровье кластера
            try:
                row = await conn.fetchrow(cluster_health_query)
                if row:
                    cluster_health = {"check_name": row["check_name"], "status": row["status"], }
                else:
                    cluster_health = {"check_name": "Здоровье кластера", "status": "not_supported"}
            except Exception:
                cluster_health = {"check_name": "Здоровье кластера", "status": "not_supported"}

            try:
                rows = await conn.fetch(database_config_query)
                for row in rows:
                    config_parameters.append({"name": row["name"], "setting": row["setting"], "unit": row["unit"], "category": row["category"], "description": row["description"]})
            except Exception as e:
                config_parameters = [{"error": f"Ошибка получения конфигурации: {str(e)}"}]

            await conn.close()

            return {"basic_metrics": basic_metrics, "cluster_replication": cluster_info, "cluster_health": cluster_health, "database_config": config_parameters, "status": "connected"}

        except Exception as e:
            return {"basic_metrics": [{"metric": "connection_error", "value": str(e)}], "cluster_replication": [], "cluster_health": {"check_name": "Здоровье кластера", "status": "connection_error"}, "database_config": [], "status": "error"}
