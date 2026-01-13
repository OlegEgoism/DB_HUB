// src/pages/ConnectionMonitoringPage.jsx
import React, {useState, useEffect} from 'react';
import {useParams, useNavigate} from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

const ConnectionMonitoringPage = () => {
    const {id: connectionId} = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [metrics, setMetrics] = useState(null);
    const [connectionData, setConnectionData] = useState(null); // Объединяем данные

    // Преобразуем basic_metrics в объект
    const parseMetrics = (basicMetrics) => {
        const parsed = {};
        basicMetrics?.forEach(({metric, value}) => {
            parsed[metric] = value;
        });
        return parsed;
    };

useEffect(() => {
    const loadMetrics = async () => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            navigate('/login');
            return;
        }

        try {
            const response = await fetch(`http://localhost:8000/api/v1/db_metrics/${connectionId}/all`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.detail || `Ошибка: ${response.status}`);
            }

            const data = await response.json();

            // Сохраняем всю информацию о подключении
            setConnectionData({
                connection_id: data.connection_id,
                connection_name: data.connection_name,
                connection_description: data.connection_description,
                host: data.host,
                port: data.port, // Добавляем порт из API
                username: data.username, // Добавляем username из API
                database_name: data.database_name,
                environment: data.environment,
                database_type: data.database_type,
                status: data.status
            });

            // Парсим метрики
            const parsedMetrics = parseMetrics(data.basic_metrics);
            setMetrics(parsedMetrics);

        } catch (err) {
            console.error('Ошибка загрузки метрик:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    loadMetrics();
}, [connectionId, navigate]);

    // Форматирование чисел с разделителями (1,245)
    const formatCount = (str) => {
        if (!str || str === '0') return '—';
        const num = parseInt(str, 10);
        if (isNaN(num)) return str;
        return num.toLocaleString('ru-RU');
    };

    // Определение типа окружения
    const envLabel = (env) => {
        switch (env?.toLowerCase()) {
            case 'production':
                return 'ПРОДАКШЕН';
            case 'testing':
                return 'ТЕСТИРОВАНИЕ';
            case 'analytics':
                return 'АНАЛИТИКА';
            default:
                return 'РАЗРАБОТКА';
        }
    };

    if (loading) {
        return (
            <>
                <Header isAuthenticated={true}/>
                <main>
                    <div className="loading-message">
                        <i className="fas fa-spinner fa-spin"></i> Загрузка данных мониторинга...
                    </div>
                </main>
                <Footer/>
            </>
        );
    }

    if (error) {
        return (
            <>
                <Header isAuthenticated={true}/>
                <main>
                    <div className="error-message">
                        <i className="fas fa-exclamation-circle"></i> {error}
                    </div>
                </main>
                <Footer/>
            </>
        );
    }

    const m = metrics; // метрики базы данных
    const conn = connectionData; // информация о подключении

    // Извлекаем значения из connectionData
    const dbName = conn?.database_name || 'Неизвестно';
    const connectionName = conn?.connection_name || 'Без имени';
    const userName = conn?.username || 'Без имени';
    const connectionDescription = conn?.connection_description || 'Без описания';
    const dbType = conn?.database_type || 'postgresql';
    const host = conn?.host || 'localhost';
    const port = '5432'; // Стандартный порт PostgreSQL
    const env = conn?.environment || 'development';

    // Извлекаем значения из метрик
    const version = m?.postgresql_version || m?.mysql_version || '—';
    const charset = m?.default_encoding || m?.server_encoding || '—';
    const collation = m?.collation || '—';
    const uptime = m?.uptime || '—';
    const startTime = m?.start_time || '—';

    // Размеры
    const dbSize = m?.db_size || '—';
    const tablesSize = m?.all_size_table || '—';
    const tempTablesSize = m?.temp_table_size || '—';
    const systemTablesSize = m?.system_table_total_size || '—';

    // Количества
    const tablesCount = formatCount(m?.count_table);
    const tempTablesCount = formatCount(m?.temp_table_count);
    const systemTablesCount = formatCount(m?.system_table_count);
    const indexesCount = formatCount(m?.index_count);
    const indexSize = m?.index_size || '—';
    const viewsCount = formatCount(m?.view_count);
    const matViewsCount = formatCount(m?.materialized_view_count);
    const proceduresCount = formatCount(m?.procedure_count);
    const triggersCount = formatCount(m?.trigger_count);

    // Пользователи
    const totalUsers = formatCount(m?.total_users);
    const superuserCount = formatCount(m?.superuser_count);
    const activeUsers = formatCount(m?.active_users);
    const roleCount = formatCount(m?.role_count);
    const pgroleCount = formatCount(m?.pg_role_count);
    const maxConnections = formatCount(m?.max_connections);
    const currentConnections = formatCount(m?.current_connections);

    // Репликация
    const isReplicationActive = false;
    const replicationDelay = '—';

    return (
        <>
            <Header isAuthenticated={true}/>
            <main>
                <section className="database-detail-section">
                    {/* Заголовок */}
                    <div className="database-header">
                        <div className="database-info">
                            <div className="database-title">
                                <div className="database-icon">
                                    <i className="fas fa-database"></i>
                                </div>
                                <div className="title-block">
                                    <h1>{connectionName}</h1>
                                    <div className="database-meta">
                                        <span className="database-type">{dbType.toUpperCase()}</span>
                                        <span className={`status-indicator status-${conn?.status || 'unknown'}`}>
                                            {conn?.status === 'connected' ? 'Подключено' :
                                             conn?.status === 'error' ? 'Ошибка' : 'Неизвестно'}
                                        </span>
                                    </div>
                                </div>
                                <div className="card-badge-log">
                                    {envLabel(env)}
                                </div>
                                <div className="overview-card">
                                    <div className="overview-icon"><i className="fas fa-database"></i></div>
                                    <div className="overview-content">
                                        <div className="overview-value">{connectionDescription}</div>
                                        <div className="overview-label">ОПИСАИЕ БАЗА ДАННЫХ</div>
                                        <div className="overview-value">{dbName} {host}:{port}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Вкладка "Информация" */}
                    <div className="tab-pane active" id="info-tab">
                        <div className="tab-header">
                            <h3><i className="fas fa-info-circle"></i> Подробная информация о базе данных</h3>
                        </div>
                        <div className="info-db">
                            {/* Общая информация */}
                            <div className="info-section">
                                <h4><i className="fas fa-database"></i> Общая информация</h4>

                                {/*<div className="info-row">*/}
                                {/*    <span className="info-label_db">Имя подключения:</span>*/}
                                {/*    <span className="info-value">{connectionName}</span>*/}
                                {/*</div>*/}

                                {/*<div className="info-row">*/}
                                {/*    <span className="info-label_db">Описание подключения:</span>*/}
                                {/*    <span className="info-value">{connectionDescription}</span>*/}
                                {/*</div>*/}

                                {/*<div className="info-row">*/}
                                {/*    <span className="info-label_db">База данных:</span>*/}
                                {/*    <span className="info-value">{dbName}</span>*/}
                                {/*</div>*/}

                                {/*<div className="info-row">*/}
                                {/*    <span className="info-label_db">Хост:</span>*/}
                                {/*    <span className="info-value">{host}</span>*/}
                                {/*</div>*/}

                                {/*<div className="info-row">*/}
                                {/*    <span className="info-label_db">Порт:</span>*/}
                                {/*    <span className="info-value">{port}</span>*/}
                                {/*</div>*/}

                                {/*<div className="info-row">*/}
                                {/*    <span className="info-label_db">Пользователь:</span>*/}
                                {/*    <span className="info-value">{userName}</span>*/}
                                {/*</div>*/}

                                <div className="info-row">
                                    <span className="info-label_db">Размер базы данных:</span>
                                    <span className="info-value">{dbSize}</span>
                                </div>

                                <div className="info-row">
                                <span className="info-label_db">Версия СУБД:</span>
                                    <span className="info-value">{version}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label_db">Кодировка по умолчанию:</span>
                                    <span className="info-value">{charset}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label_db">Коллация:</span>
                                    <span className="info-value">{collation}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label_db">Время работы:</span>
                                    <span className="info-value">{uptime}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label_db">Дата запуска:</span>
                                    <span className="info-value">{startTime}</span>
                                </div>
                            </div>

                            {/* Структура базы */}
                            <div className="info-section">
                                <h4><i className="fas fa-sitemap"></i> Структура базы</h4>

                                <div className="info-row">
                                    <span className="info-label_db">Количество таблиц:</span>
                                    <span className="info-value">{tablesCount}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label_db">Размер таблиц:</span>
                                    <span className="info-value">{tablesSize}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label_db">Количество временных таблиц:</span>
                                    <span className="info-value">{tempTablesCount}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label_db">Размер временных таблиц:</span>
                                    <span className="info-value">{tempTablesSize}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label_db">Количество системных таблиц:</span>
                                    <span className="info-value">{systemTablesCount}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label_db">Размер системных таблиц:</span>
                                    <span className="info-value">{systemTablesSize}</span>
                                </div>

                                <div className="info-row">
                                    <span className="info-label_db">Количество индексов:</span>
                                    <span className="info-value">{indexesCount}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label_db">Размер индексов:</span>
                                    <span className="info-value">{indexSize}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label_db">Количество представлений:</span>
                                    <span className="info-value">{viewsCount}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label_db">Материализованных представлений:</span>
                                    <span className="info-value">{matViewsCount}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label_db">Хранимых процедур:</span>
                                    <span className="info-value">{proceduresCount}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label_db">Триггеров:</span>
                                    <span className="info-value">{triggersCount}</span>
                                </div>
                            </div>

                            {/* Пользователи и группы */}
                            <div className="info-section">
                                <h4><i className="fas fa-users"></i> Пользователи и группы</h4>
                                <div className="info-row">
                                    <span className="info-label_db">Всего пользователей:</span>
                                    <span className="info-value">{totalUsers}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label_db">Всего суперпользователей:</span>
                                    <span className="info-value">{superuserCount}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label_db">Активных пользователей:</span>
                                    <span className="info-value">{activeUsers}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label_db">Количество групп:</span>
                                    <span className="info-value">{roleCount}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label_db">Количество системных групп:</span>
                                    <span className="info-value">{pgroleCount}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label_db">Максимальное кол-во подключений:</span>
                                    <span className="info-value">{maxConnections}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label_db">Текущих подключений:</span>
                                    <span className="info-value">{currentConnections}</span>
                                </div>
                            </div>

                            {/* Репликация */}
                            <div className="info-section">
                                <h4><i className="fas fa-project-diagram"></i> Кластеризация и репликация</h4>
                                <div className="info-row">
                                    <span className="info-label_db">Статус репликации:</span>
                                    <span className="info-value">
                                        {isReplicationActive ? (
                                            <>
                                                <i className="fas fa-check-circle"></i> Активна
                                            </>
                                        ) : 'Не поддерживается'}
                                    </span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label_db">Задержка репликации:</span>
                                    <span className="info-value">{replicationDelay}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
            <Footer/>
        </>
    );
};

export default ConnectionMonitoringPage;