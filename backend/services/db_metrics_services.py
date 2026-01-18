# backend/services/db_metrics_services.py
from typing import Dict, Any, List
from backend.models.db import DB_Connection
from backend.utils.external_db import external_db_connection


class DBMetricsService:

    @staticmethod
    async def get_database_metrics(connection: DB_Connection) -> Dict[str, Any]:
        """Получить все метрики базы данных"""
        try:
            async with external_db_connection(connection) as conn:
                # === Базовые метрики ===
                basic_metrics_query = """
                SELECT name as metric, setting as value
                FROM pg_settings
                WHERE name IN ('autovacuum', 'client_encoding', 'effective_cache_size', 'listen_addresses', 'log_statement_stats', 'server_encoding','server_version', 'shared_buffers', 'TimeZone', 'work_mem')
                UNION ALL
                SELECT 'database_collation' as metric, datcollate as value
                FROM pg_database
                WHERE datname = current_database()
                UNION ALL
                SELECT 'server_start_time' as metric, to_char(pg_postmaster_start_time(), 'YYYY-MM-DD HH24:MI:SS TZ') as value
                UNION ALL
                SELECT 'server_uptime' as metric, age(now(), pg_postmaster_start_time())::text as value
                UNION ALL
                SELECT 'db_size' AS metric, pg_size_pretty(pg_database_size(current_database())) AS value
                UNION ALL
                SELECT 'table_count', COUNT(*)::TEXT
                FROM information_schema.tables
                WHERE table_schema NOT IN ('information_schema', 'pg_catalog') AND table_type = 'BASE TABLE'
                UNION ALL
                SELECT 'table_size', pg_size_pretty(COALESCE(SUM(pg_total_relation_size(quote_ident(schemaname) || '.' || quote_ident(tablename))), 0))
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
                SELECT 'system_table_size', pg_size_pretty(COALESCE(SUM(pg_total_relation_size(quote_ident(schemaname) || '.' || quote_ident(tablename))), 0))
                FROM pg_tables
                WHERE schemaname IN ('pg_catalog', 'information_schema')
                UNION ALL
                SELECT 'index_count', COUNT(*)::TEXT
                FROM pg_indexes
                WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
                UNION ALL
                SELECT 'index_size', pg_size_pretty(COALESCE(SUM(pg_relation_size(indexrelid)), 0))
                FROM pg_index
                WHERE indisvalid
                UNION ALL
                SELECT 'view_count', COUNT(*)::TEXT
                FROM information_schema.views
                WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
                UNION ALL
                SELECT 'views_size' AS metric, pg_size_pretty(COALESCE(SUM(pg_total_relation_size(schemaname || '.' || viewname)), 0)) AS value
                FROM pg_views
                WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
                UNION ALL
                SELECT 'materialized_view_count' AS metric, COUNT(*)::TEXT AS value
                FROM pg_class
                WHERE relkind = 'm' AND relnamespace NOT IN (SELECT oid FROM pg_namespace WHERE nspname IN ('information_schema', 'pg_catalog'))
                UNION ALL
                SELECT 'materialized_views_size', pg_size_pretty(COALESCE(SUM(pg_total_relation_size(oid)), 0))
                FROM pg_class
                WHERE relkind = 'm' AND relnamespace NOT IN (SELECT oid FROM pg_namespace WHERE nspname IN ('information_schema', 'pg_catalog'))
                UNION ALL
                SELECT 'procedure_count', COUNT(*)::TEXT
                FROM information_schema.routines
                WHERE routine_schema NOT IN ('information_schema', 'pg_catalog') AND routine_type = 'PROCEDURE'
                UNION ALL
                SELECT 'trigger_count', COUNT(*)::TEXT
                FROM information_schema.triggers
                WHERE trigger_schema NOT IN ('information_schema', 'pg_catalog')
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
                WHERE state IS NOT null;
                """
                rows = await conn.fetch(basic_metrics_query)
                basic_metrics = [{"metric": r["metric"], "value": r["value"]} for r in rows]

                # === Информация о расширениях ===
                extensions_query = """
                SELECT 
                    e.extname AS name,
                    e.extversion AS version
                FROM 
                    pg_extension e
                ORDER BY e.extname;
                """
                ext_rows = await conn.fetch(extensions_query)
                extensions = [
                    {
                        "name": r["name"],
                        "version": r["version"]
                    }
                    for r in ext_rows
                ]

                # === Сводка по сегментам (метрики) ===
                cluster_replication_query = """
                SELECT 'total_segments', COUNT(*)::numeric
                FROM gp_segment_configuration
                WHERE content >= 0
                UNION ALL
                SELECT 'up_segments', COUNT(*) FILTER (WHERE status = 'u')::numeric
                FROM gp_segment_configuration
                WHERE content >= 0
                UNION ALL
                SELECT 'down_segments', COUNT(*) FILTER (WHERE status = 'd')::numeric
                FROM gp_segment_configuration
                WHERE content >= 0
                UNION ALL
                SELECT 'synced_segments', COUNT(*) FILTER (WHERE mode = 's')::numeric
                FROM gp_segment_configuration
                WHERE content >= 0
                UNION ALL
                SELECT 'primary_segments', COUNT(*) FILTER (WHERE role = 'p')::numeric
                FROM gp_segment_configuration
                WHERE content >= 0
                UNION ALL
                SELECT 'mirror_segments', COUNT(*) FILTER (WHERE role = 'm')::numeric
                FROM gp_segment_configuration
                WHERE content >= 0
                UNION ALL
                SELECT 'health_percentage', ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'u') / COUNT(*))::numeric
                FROM gp_segment_configuration
                WHERE content >= 0;
                """
                cluster_info = []
                try:
                    rows = await conn.fetch(cluster_replication_query)
                    cluster_info = [{"metric": r[0], "value": str(r[1])} for r in rows]
                except Exception:
                    cluster_info = []

                # === Детали сегментов ===
                segment_details = []
                try:
                    segment_rows = await conn.fetch("""
                    SELECT
                    content,
                    role,
                    status,
                    port,
                    address
                    FROM pg_catalog.gp_segment_configuration
                    ORDER BY dbid ASC;
                    """)
                    segment_details = [
                        {"content": r["content"], "role": r["role"], "status": r["status"], "port": r["port"], "address": r["address"]}
                        for r in segment_rows
                    ]
                except Exception:
                    segment_details = []

                return {
                    "status": "connected",
                    "basic_metrics": basic_metrics,
                    "extensions": extensions,
                    "cluster_replication": cluster_info,
                    "segment_details": segment_details,
                }
        except Exception as e:
            return {
                "status": "error",
                "basic_metrics": [{"metric": "connection_error", "value": str(e)}],
                "extensions": [],
                "cluster_replication": [],
                "segment_details": [],
            }

    @staticmethod
    async def get_database_settings(connection: DB_Connection) -> List[Dict[str, str]]:
        """Получить все настройки базы данных"""
        try:
            async with external_db_connection(connection) as conn:
                query = """
                SELECT name, setting
                FROM pg_settings
                ORDER BY name;
                """
                rows = await conn.fetch(query)
                return [{"name": r["name"], "setting": r["setting"]} for r in rows]
        except Exception as e:
            raise Exception(f"Ошибка при выполнении SHOW ALL: {str(e)}")