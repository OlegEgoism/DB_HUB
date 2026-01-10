// src/pages/ConnectionMonitoringPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

const ConnectionMonitoringPage = () => {
    const { id: connectionId } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [metrics, setMetrics] = useState(null);

    // Преобразуем basic_metrics в объект
    const parseMetrics = (basicMetrics) => {
        const parsed = {};
        basicMetrics?.forEach(({ metric, value }) => {
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
                const parsed = parseMetrics(data.basic_metrics);
                setMetrics(parsed);
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
            case 'production': return 'ПРОДАКШЕН';
            case 'testing': return 'ТЕСТИРОВАНИЕ';
            case 'analytics': return 'АНАЛИТИКА';
            default: return 'РАЗРАБОТКА';
        }
    };

    if (loading) {
        return (
            <>
                <Header isAuthenticated={true} />
                <main>
                    <div className="loading-message">
                        <i className="fas fa-spinner fa-spin"></i> Загрузка данных мониторинга...
                    </div>
                </main>
                <Footer />
            </>
        );
    }

    if (error) {
        return (
            <>
                <Header isAuthenticated={true} />
                <main>
                    <div className="error-message">
                        <i className="fas fa-exclamation-circle"></i> {error}
                    </div>
                </main>
                <Footer />
            </>
        );
    }

    const m = metrics; // сокращение для удобства

    // Извлекаем значения
    const dbName = m?.database_name || 'core';
    const dbType = m?.database_type || 'postgresql';
    const host = m?.host || 'localhost';
    const port = m?.port || '5432';
    const env = m?.environment || 'production';
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
    const viewsCount = formatCount(m?.view_count);
    const matViewsCount = formatCount(m?.materialized_view_count);
    const proceduresCount = formatCount(m?.procedure_count);
    const triggersCount = formatCount(m?.trigger_count);

    // Пользователи
    const totalUsers = formatCount(m?.total_users);
    const activeUsers = formatCount(m?.active_users);
    const roleCount = formatCount(m?.role_count);
    const maxConnections = formatCount(m?.max_connections);
    const currentConnections = formatCount(m?.current_connections);

    // Репликация (в данном ответе пусто, но оставим заглушку)
    const isReplicationActive = false; // или логика на основе данных
    const replicationDelay = '—';

    return (
        <>
            <Header isAuthenticated={true} />
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
                                    <h1>{m?.connection_name || 'База данных'}</h1>
                                    <div className="database-meta">
                                        <span className="database-type">{dbType.toUpperCase()}</span>
                                    </div>
                                </div>
                                <div className="card-badge-log">
                                    {envLabel(env)}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Основная информация */}
                    <div className="database-overview">
                        <div className="overview-card">
                            <div className="overview-icon"><i className="fas fa-database"></i></div>
                            <div className="overview-content">
                                <div className="overview-value">{dbName}</div>
                                <div className="overview-label">БАЗА ДАННЫХ</div>
                            </div>
                        </div>
                        <div className="overview-card">
                            <div className="overview-icon"><i className="fas fa-server"></i></div>
                            <div className="overview-content">
                                <div className="overview-value">{host}:{port}</div>
                                <div className="overview-label">ХОСТ:ПОРТ</div>
                            </div>
                        </div>
                        <div className="overview-card">
                            <div className="overview-icon"><i className="fas fa-hdd"></i></div>
                            <div className="overview-content">
                                <div className="overview-value">{dbSize}</div>
                                <div className="overview-label">РАЗМЕР</div>
                            </div>
                        </div>
                        <div className="overview-card">
                            <div className="overview-icon"><i className="fas fa-table"></i></div>
                            <div className="overview-content">
                                <div className="overview-value">{tablesCount}</div>
                                <div className="overview-label">ТАБЛИЦ</div>
                            </div>
                        </div>
                        <div className="overview-card">
                            <div className="overview-icon"><i className="fas fa-users"></i></div>
                            <div className="overview-content">
                                <div className="overview-value">{currentConnections}</div>
                                <div className="overview-label">ПОДКЛЮЧЕНИЙ</div>
                            </div>
                        </div>
                    </div>

                    {/* Вкладка "Информация" */}
                    <div className="tab-pane active" id="info-tab">
                        <div className="tab-header">
                            <h3><i className="fas fa-info-circle"></i> Подробная информация о базе данных</h3>
                        </div>
                        <div className="info-grid">
                            {/* Общая информация */}
                            <div className="info-section">
                                <h4><i className="fas fa-database"></i> Общая информация</h4>
                                <div className="info-row">
                                    <span className="info-label">Размер базы данных:</span>
                                    <span className="info-value">{dbSize}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Количество таблиц:</span>
                                    <span className="info-value">{tablesCount}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Общий размер таблиц:</span>
                                    <span className="info-value">{tablesSize}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Количество временных таблиц:</span>
                                    <span className="info-value">{tempTablesCount}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Размер временных таблиц:</span>
                                    <span className="info-value">{tempTablesSize}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Системных таблиц:</span>
                                    <span className="info-value">{systemTablesCount}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Размер системных таблиц:</span>
                                    <span className="info-value">{systemTablesSize}</span>
                                </div>
                            </div>

                            {/* Пользователи и группы */}
                            <div className="info-section">
                                <h4><i className="fas fa-users"></i> Пользователи и группы</h4>
                                <div className="info-row">
                                    <span className="info-label">Всего пользователей:</span>
                                    <span className="info-value">{totalUsers}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Активных пользователей:</span>
                                    <span className="info-value">{activeUsers}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Количество ролей:</span>
                                    <span className="info-value">{roleCount}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Максимальное кол-во подключений:</span>
                                    <span className="info-value">{maxConnections}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Текущих подключений:</span>
                                    <span className="info-value">{currentConnections}</span>
                                </div>
                            </div>

                            {/* Структура базы */}
                            <div className="info-section">
                                <h4><i className="fas fa-sitemap"></i> Структура базы</h4>
                                <div className="info-row">
                                    <span className="info-label">Количество индексов:</span>
                                    <span className="info-value">{indexesCount}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Количество представлений:</span>
                                    <span className="info-value">{viewsCount}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Материализованных представлений:</span>
                                    <span className="info-value">{matViewsCount}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Хранимых процедур:</span>
                                    <span className="info-value">{proceduresCount}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Триггеров:</span>
                                    <span className="info-value">{triggersCount}</span>
                                </div>
                            </div>

                            {/* Репликация */}
                            <div className="info-section">
                                <h4><i className="fas fa-project-diagram"></i> Кластеризация и репликация</h4>
                                <div className="info-row">
                                    <span className="info-label">Статус репликации:</span>
                                    <span className="info-value">
                                        {isReplicationActive ? (
                                            <>
                                                <i className="fas fa-check-circle"></i> Активна
                                            </>
                                        ) : 'Не поддерживается'}
                                    </span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Задержка репликации:</span>
                                    <span className="info-value">{replicationDelay}</span>
                                </div>
                            </div>

                            {/* Версии и настройки */}
                            <div className="info-section">
                                <h4><i className="fas fa-code-branch"></i> Версии и настройки</h4>
                                <div className="info-row">
                                    <span className="info-label">Версия СУБД:</span>
                                    <span className="info-value">{version}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Кодировка по умолчанию:</span>
                                    <span className="info-value">{charset}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Коллация:</span>
                                    <span className="info-value">{collation}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Время работы (uptime):</span>
                                    <span className="info-value">{uptime}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Дата запуска:</span>
                                    <span className="info-value">{startTime}</span>
                                </div>
                            </div>
                        </div>

                        {/* Кнопки действий */}
                        <div className="info-actions">
                            <button
                                className="btn btn-outline"
                                onClick={() => window.location.reload()}
                            >
                                <i className="fas fa-sync-alt"></i> Обновить статистику
                            </button>
                            <button
                                className="btn btn-outline"
                                onClick={() => alert('Экспорт будет реализован позже')}
                            >
                                <i className="fas fa-download"></i> Экспорт информации
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={() => alert('Расширенные метрики — в разработке')}
                            >
                                <i className="fas fa-chart-line"></i> Расширенные метрики
                            </button>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </>
    );
};

export default ConnectionMonitoringPage;