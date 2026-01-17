// src/pages/ConnectionMonitoringPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

const ConnectionMonitoringPage = () => {
    const { id: connectionId } = useParams();
    const navigate = useNavigate();

    // Общие состояния
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [metrics, setMetrics] = useState(null);
    const [connectionData, setConnectionData] = useState(null);
    const [activeTab, setActiveTab] = useState('info');

    // Состояния для вкладки "Группы"
    const [groupsData, setGroupsData] = useState(null);
    const [groupsLoading, setGroupsLoading] = useState(false);
    const [groupsError, setGroupsError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(8);
    const PAGE_SIZES = [4, 8, 16, 32];

    // Модальные состояния
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [groupToDelete, setGroupToDelete] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingGroup, setEditingGroup] = useState(null);
    const [editForm, setEditForm] = useState({ name: '', description: '' });

    const parseMetrics = (basicMetrics) => {
        const parsed = {};
        basicMetrics?.forEach(({ metric, value }) => {
            parsed[metric] = value;
        });
        return parsed;
    };

    // Загрузка метрик и общей информации
    useEffect(() => {
        const loadMetrics = async () => {
            const token = localStorage.getItem('access_token');
            if (!token) {
                navigate('/login');
                return;
            }

            try {
                const response = await fetch(`http://localhost:8000/api/v1/db_connections/${connectionId}/metrics`, {
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

                setConnectionData({
                    connection_id: data.connection_id,
                    connection_name: data.connection_name,
                    connection_description: data.connection_description,
                    host: data.host,
                    port: data.port,
                    username: data.username,
                    database_name: data.database_name,
                    environment: data.environment,
                    database_type: data.database_type,
                    status: data.status
                });

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

    // Загрузка групп
    const loadGroups = useCallback(async () => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            navigate('/login');
            return;
        }

        setGroupsLoading(true);
        setGroupsError(null);

        try {
            const params = new URLSearchParams();
            params.append('page', currentPage);
            params.append('size', pageSize);
            if (searchQuery.trim()) {
                params.append('search', searchQuery.trim());
            }

            const url = `http://localhost:8000/api/v1/db_connections/${connectionId}/groups/?${params.toString()}`;

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.detail || `Ошибка загрузки групп: ${response.status}`);
            }

            const data = await response.json();
            setGroupsData(data);
        } catch (err) {
            console.error('Ошибка загрузки групп:', err);
            setGroupsError(err.message);
        } finally {
            setGroupsLoading(false);
        }
    }, [connectionId, currentPage, pageSize, searchQuery, navigate]);

    useEffect(() => {
        if (activeTab === 'groups') {
            loadGroups();
        }
    }, [activeTab, loadGroups]);

    // === УДАЛЕНИЕ ГРУППЫ ===
    const openDeleteModal = (group) => {
        setGroupToDelete(group);
        setShowDeleteModal(true);
    };

    const deleteGroup = async () => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            navigate('/login');
            return;
        }

        try {
            const response = await fetch(
                `http://localhost:8000/api/v1/db_connections/${connectionId}/groups/${groupToDelete.oid}`,
                {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` },
                }
            );

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.detail || `Ошибка: ${response.status}`);
            }

            await loadGroups();
            setShowDeleteModal(false);
            setGroupToDelete(null);
        } catch (err) {
            console.error('Ошибка удаления группы:', err);
            setError(`Не удалось удалить группу: ${err.message}`);
            setShowDeleteModal(false);
        }
    };

    // === РЕДАКТИРОВАНИЕ ГРУППЫ ===
    const openEditModal = (group) => {
        setEditingGroup(group);
        setEditForm({
            name: group.name || '',
            description: group.description || '',
        });
        setShowEditModal(true);
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditForm((prev) => ({ ...prev, [name]: value }));
    };

    const saveEditGroup = async () => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            navigate('/login');
            return;
        }

        try {
            const response = await fetch(
                `http://localhost:8000/api/v1/db_connections/${connectionId}/groups/${editingGroup.oid}`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(editForm),
                }
            );

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.detail || `Ошибка: ${response.status}`);
            }

            await loadGroups();
            setShowEditModal(false);
            setEditingGroup(null);
        } catch (err) {
            console.error('Ошибка обновления группы:', err);
            setError(`Не удалось обновить группу: ${err.message}`);
            setShowEditModal(false);
        }
    };

    // === Остальные обработчики ===
    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
        setCurrentPage(1);
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= (groupsData?.pages || 1)) {
            setCurrentPage(newPage);
        }
    };

    const handlePageSizeChange = (e) => {
        const newSize = parseInt(e.target.value, 10);
        setPageSize(newSize);
        setCurrentPage(1);
    };

    const downloadShowAll = async () => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            navigate('/login');
            return;
        }

        try {
            const response = await fetch(`http://localhost:8000/api/v1/db_connections/${connectionId}/settings`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                alert(`Ошибка при загрузке настроек: ${errData.detail || response.statusText}`);
                return;
            }

            const data = await response.json();

            const csvContent = [
                ['Параметр', 'Значение'],
                ...data.settings.map(item => [item.name, item.setting])
            ]
                .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
                .join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `postgresql-settings-${connectionData?.connection_name || connectionId}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Ошибка при скачивании SHOW ALL:', err);
            alert('Не удалось скачать настройки: ' + err.message);
        }
    };

    const formatCount = (str) => {
        if (!str || str === '0') return '—';
        const num = parseInt(str, 10);
        if (isNaN(num)) return str;
        return num.toLocaleString('ru-RU');
    };

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

    const m = metrics;
    const conn = connectionData;

    const dbName = conn?.database_name || 'Неизвестно';
    const connectionName = conn?.connection_name || 'Без имени';
    const connectionDescription = conn?.connection_description || 'Без описания';
    const dbType = (conn?.database_type || 'postgresql').toUpperCase();
    const host = conn?.host || 'localhost';
    const port = conn?.port || '5432';
    const env = conn?.environment || 'development';

    const serverVersion = m?.server_version || '—';
    const clientEncoding = m?.client_encoding || '—';
    const serverEncoding = m?.server_encoding || '—';
    const timeZone = m?.TimeZone || '—';
    const autovacuum = m?.autovacuum === 'on' ? 'Включено' : 'Выключено';
    const effectiveCacheSize = m?.effective_cache_size || '—';
    const logStatementStats = m?.log_statement_stats === 'on' ? 'Включено' : 'Выключено';
    const listenAddresses = m?.listen_addresses || '—';
    const databaseCollation = m?.database_collation || '—';
    const serverStartTime = m?.server_start_time || '—';
    const serverUptime = m?.server_uptime || '—';

    const sharedBuffers = m?.shared_buffers || '—';
    const workMem = m?.work_mem || '—';

    const dbSize = m?.db_size || '—';
    const tableSize = m?.table_size || '—';
    const tempTableSize = m?.temp_table_size || '—';
    const systemTableSize = m?.system_table_size || '—';
    const indexSize = m?.index_size || '—';
    const viewsSize = m?.views_size || '—';
    const materializedViewsSize = m?.materialized_views_size || '—';

    const tableCount = formatCount(m?.table_count);
    const tempTableCount = formatCount(m?.temp_table_count);
    const systemTableCount = formatCount(m?.system_table_count);
    const indexCount = formatCount(m?.index_count);
    const viewCount = formatCount(m?.view_count);
    const materializedViewCount = formatCount(m?.materialized_view_count);
    const procedureCount = formatCount(m?.procedure_count);
    const triggerCount = formatCount(m?.trigger_count);

    const totalUsers = formatCount(m?.total_users);
    const superuserCount = formatCount(m?.superuser_count);
    const activeUsers = formatCount(m?.active_users);
    const roleCount = formatCount(m?.role_count);
    const pgRoleCount = formatCount(m?.pg_role_count);
    const maxConnections = formatCount(m?.max_connections);
    const currentConnections = formatCount(m?.current_connections);

    return (
        <>
            <Header isAuthenticated={true} />
            <main>
                <section className="database-detail-section">
                    <div className="database-header">
                        <div className="database-info">
                            <div className="database-title">
                                <div className="database-icon">
                                    <i className="fas fa-database"></i>
                                </div>
                                <div className="title-block">
                                    <h1>{connectionName}</h1>
                                    <div className="database-meta">
                                        <span className="database-type">{dbType}</span>
                                        <span className={`status-indicator status-${conn?.status || 'unknown'}`}>
                                            {conn?.status === 'connected'
                                                ? 'Подключено'
                                                : conn?.status === 'error'
                                                    ? 'Ошибка'
                                                    : 'Неизвестно'}
                                        </span>
                                    </div>
                                </div>
                                <div className="card-badge-log">{envLabel(env)}</div>
                                <div className="overview-card">
                                    <div className="overview-icon"><i className="fas fa-database"></i></div>
                                    <div className="overview-content">
                                        <div className="overview-value">{connectionDescription}</div>
                                        <div className="overview-label">ОПИСАНИЕ БАЗЫ ДАННЫХ</div>
                                        <div className="overview-value">{dbName} {host}:{port}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Вкладки */}
                    <div className="tabs">
                        <button
                            className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`}
                            onClick={() => setActiveTab('info')}
                        >
                            <i className="fas fa-info-circle"></i> Информация
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'groups' ? 'active' : ''}`}
                            onClick={() => setActiveTab('groups')}
                        >
                            <i className="fas fa-users-cog"></i> Группы
                        </button>
                    </div>

                    {/* Содержимое вкладок */}
                    {activeTab === 'info' && (
                        <div className="tab-pane active" id="info-tab">
                            <div className="info-db">
                                {/* Общая информация */}
                                <div className="info-section">
                                    <h4><i className="fas fa-database"></i> Общая информация</h4>
                                    <div className="info-row">
                                        <span className="info-label_db">Размер базы данных:</span>
                                        <span className="info-value">{dbSize}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="info-label_db">Версия базы данных:</span>
                                        <span className="info-value">{serverVersion}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="info-label_db">Кодировка клиент/сервер:</span>
                                        <span className="info-value">{clientEncoding}/{serverEncoding}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="info-label_db">Коллация:</span>
                                        <span className="info-value">{databaseCollation}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="info-label_db">Авто очистка (autovacuum):</span>
                                        <span className="info-value">{autovacuum}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="info-label_db">Часовой пояс:</span>
                                        <span className="info-value">{timeZone}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="info-label_db">Адреса прослушивания:</span>
                                        <span className="info-value">{listenAddresses}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="info-label_db">Логирование:</span>
                                        <span className="info-value">{logStatementStats}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="info-label_db">Размер кэша (cache):</span>
                                        <span className="info-value">{effectiveCacheSize}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="info-label_db">Размер буфера (buffers):</span>
                                        <span className="info-value">{sharedBuffers}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="info-label_db">Размер рабочих (works):</span>
                                        <span className="info-value">{workMem}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="info-label_db">Время запуска сервера:</span>
                                        <span className="info-value">{serverStartTime}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="info-label_db">Время работы:</span>
                                        <span className="info-value">{serverUptime}</span>
                                    </div>
                                </div>

                                {/* Структура базы */}
                                <div className="info-section">
                                    <h4><i className="fas fa-sitemap"></i> Структура базы</h4>
                                    <div className="info-row">
                                        <span className="info-label_db">Количество таблиц:</span>
                                        <span className="info-value">{tableCount}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="info-label_db">Размер таблиц:</span>
                                        <span className="info-value">{tableSize}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="info-label_db">Количество временных таблиц:</span>
                                        <span className="info-value">{tempTableCount}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="info-label_db">Размер временных таблиц:</span>
                                        <span className="info-value">{tempTableSize}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="info-label_db">Количество системных таблиц:</span>
                                        <span className="info-value">{systemTableCount}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="info-label_db">Размер системных таблиц:</span>
                                        <span className="info-value">{systemTableSize}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="info-label_db">Количество индексов:</span>
                                        <span className="info-value">{indexCount}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="info-label_db">Размер индексов:</span>
                                        <span className="info-value">{indexSize}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="info-label_db">Количество представлений:</span>
                                        <span className="info-value">{viewCount}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="info-label_db">Размер представлений:</span>
                                        <span className="info-value">{viewsSize}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="info-label_db">Количество материализованных представлений:</span>
                                        <span className="info-value">{materializedViewCount}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="info-label_db">Размер материализованных представлений:</span>
                                        <span className="info-value">{materializedViewsSize}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="info-label_db">Количество процедур:</span>
                                        <span className="info-value">{procedureCount}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="info-label_db">Количество триггеров:</span>
                                        <span className="info-value">{triggerCount}</span>
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
                                        <span className="info-label_db">Суперпользователей:</span>
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
                                        <span className="info-value">{pgRoleCount}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="info-label_db">Максимальное количество подключений:</span>
                                        <span className="info-value">{maxConnections}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="info-label_db">Текущих подключений:</span>
                                        <span className="info-value">{currentConnections}</span>
                                    </div>
                                </div>

                                {/* Кластер Greenplum */}
                                {(m?.total_segments || m?.up_segments) && (
                                    <div className="info-section">
                                        <h4><i className="fas fa-project-diagram"></i> Кластер/Сегмент</h4>
                                        <div className="info-row">
                                            <span className="info-label_db">Всего сегментов:</span>
                                            <span className="info-value">{formatCount(m?.total_segments)}</span>
                                        </div>
                                        <div className="info-row">
                                            <span className="info-label_db">Работает:</span>
                                            <span className="info-value">{formatCount(m?.up_segments)}</span>
                                        </div>
                                        <div className="info-row">
                                            <span className="info-label_db">Выключено:</span>
                                            <span className="info-value">{formatCount(m?.down_segments)}</span>
                                        </div>
                                        <div className="info-row">
                                            <span className="info-label_db">Синхронизировано:</span>
                                            <span className="info-value">{formatCount(m?.synced_segments)}</span>
                                        </div>
                                        <div className="info-row">
                                            <span className="info-label_db">Основной(master):</span>
                                            <span className="info-value">{formatCount(m?.primary_segments)}</span>
                                        </div>
                                        <div className="info-row">
                                            <span className="info-label_db">Зеркал(mirror):</span>
                                            <span className="info-value">{formatCount(m?.mirror_segments)}</span>
                                        </div>
                                        <div className="info-row">
                                            <span className="info-label_db">Здоровье (%):</span>
                                            <span className="info-value">{m?.health_percentage || '—'}%</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <button onClick={downloadShowAll} className="btn btn-secondary">
                                <i className="fas fa-download"></i> Скачать настройки
                            </button>
                        </div>
                    )}

                    {activeTab === 'groups' && (
                        <div className="tab-pane active" id="groups-tab">
                            <div className="tab-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <input
                                    type="text"
                                    placeholder="Поиск по названию и описанию группы"
                                    value={searchQuery}
                                    onChange={handleSearchChange}
                                    className="form-control"
                                    style={{ width: '300px' }}
                                />
                            </div>

                            {groupsLoading ? (
                                <div className="loading-message">
                                    <i className="fas fa-spinner fa-spin"></i> Загрузка групп...
                                </div>
                            ) : groupsError ? (
                                <div className="error-message">
                                    <i className="fas fa-exclamation-circle"></i> {groupsError}
                                </div>
                            ) : groupsData?.items?.length > 0 ? (
                                <>
                                    <div className="groups-list">
                                        <table className="table table-striped">
                                            <thead>
                                                <tr>
                                                    <th>OID</th>
                                                    <th>Название</th>
                                                    <th>Описание</th>
                                                    <th>Кол-во пользователей</th>
                                                    <th>Действия</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {groupsData.items.map(group => (
                                                    <tr key={group.oid}>
                                                        <td>{group.oid}</td>
                                                        <td>{group.name}</td>
                                                        <td>{group.description || '—'}</td>
                                                        <td>{group.user_count}</td>
                                                        <td>
                                                            <button
                                                                className="btn btn-sm btn-outline-primary me-2"
                                                                onClick={() => openEditModal(group)}
                                                                title="Редактировать"
                                                            >
                                                                <i className="fas fa-edit"></i>
                                                            </button>
                                                            <button
                                                                className="btn btn-sm btn-outline-danger"
                                                                onClick={() => openDeleteModal(group)}
                                                                title="Удалить"
                                                            >
                                                                <i className="fas fa-trash"></i>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Пагинация как в HomePage */}
                                    {groupsData.total > 0 && (
                                        <div className="pagination-container" style={{ marginTop: '24px' }}>
                                            <div className="pagination-info">
                                                Показано {groupsData.items.length} из {groupsData.total} групп
                                            </div>
                                            <div className="pagination-controls">
                                                <select
                                                    value={pageSize}
                                                    onChange={handlePageSizeChange}
                                                    className="pagination-select"
                                                >
                                                    {PAGE_SIZES.map(size => (
                                                        <option key={size} value={size}>
                                                            {size} на странице
                                                        </option>
                                                    ))}
                                                </select>
                                                <div className="pagination-buttons">
                                                    <button
                                                        className="btn btn-ghost"
                                                        onClick={() => handlePageChange(currentPage - 1)}
                                                        disabled={currentPage === 1}
                                                    >
                                                        <i className="fas fa-chevron-left"></i>
                                                    </button>
                                                    <span className="pagination-page-info">
                                                        Страница {currentPage} из {groupsData.pages}
                                                    </span>
                                                    <button
                                                        className="btn btn-ghost"
                                                        onClick={() => handlePageChange(currentPage + 1)}
                                                        disabled={currentPage === groupsData.pages}
                                                    >
                                                        <i className="fas fa-chevron-right"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="no-data-message">
                                    {searchQuery ? 'Группы по запросу не найдены' : 'Группы не найдены'}
                                </div>
                            )}
                        </div>
                    )}
                </section>
            </main>

            {/* Модальное окно удаления */}
            {showDeleteModal && (
                <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
                    <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Удаление группы</h3>
                        </div>
                        <div className="modal-body">
                            <p>
                                Вы уверены, что хотите удалить группу <strong>«{groupToDelete?.name}»</strong>?
                                Это действие нельзя отменить.
                            </p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>
                                Отмена
                            </button>
                            <button className="btn btn-danger" onClick={deleteGroup}>
                                Удалить
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Модальное окно редактирования */}
            {showEditModal && (
                <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Редактирование группы</h3>
                        </div>
                        <div className="modal-body">
                            <div className="form-group mb-3">
                                <label>Название</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="name"
                                    value={editForm.name}
                                    onChange={handleEditChange}
                                />
                            </div>
                            <div className="form-group">
                                <label>Описание</label>
                                <textarea
                                    className="form-control"
                                    name="description"
                                    value={editForm.description}
                                    onChange={handleEditChange}
                                    rows="3"
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                                Отмена
                            </button>
                            <button className="btn btn-primary" onClick={saveEditGroup}>
                                Сохранить
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Footer />
        </>
    );
};

export default ConnectionMonitoringPage;