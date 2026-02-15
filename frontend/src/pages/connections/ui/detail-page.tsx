// frontend/src/pages/connections/ui/detail-page.tsx
import {useEffect, useState} from 'react';
import {useParams, useNavigate} from 'react-router';
import clsx from 'clsx';
import styles from './detail-page.module.scss';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
    faDatabase,
    faSpinner,
    faExclamationCircle,
    faTrashAlt,
    faChartBar,
    faInfoCircle,
    faCogs,
    faTable,
    faUserGroup,
    faNetworkWired,
    faUsers,
    faSearch,
    faTimes,
    faChevronLeft,
    faChevronRight,
    faChevronCircleLeft,
    faChevronCircleRight,
    faUser,
    faPencilAlt,
} from '@fortawesome/free-solid-svg-icons';
import {EditConnectionModal} from './EditConnectionModal';
import {EditUserModal} from './EditUserModal';
import {useConnectionUsers} from '../lib/useConnectionUsers';

interface Connection {
    id: number;
    database_name: string;
    description: string | null;
    host: string;
    port: number;
    username: string;
    name: string;
    database_type: string;
    environment: string;
    is_favorite: boolean;
    owner_id: number;
    owner_username: string;
    status: string;
    db_size_mb: number | null;
    created_at: string;
}

interface Metric {
    metric: string;
    value: string;
}

interface Extension {
    name: string;
    version: string;
}

interface DatabaseMetrics {
    connection_id: number;
    connection_name: string;
    connection_description: string | null;
    database_name: string;
    host: string;
    port: number;
    username: string;
    environment: string;
    database_type: string;
    status: string;
    basic_metrics: Metric[];
    extensions: Extension[];
    cluster_replication: any[];
    segment_details: any[];
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
type TabType = 'metrics' | 'extensions' | 'users';
const PAGE_SIZES = [4, 8, 16, 32, 50, 100];

export default function ConnectionDetailPage() {
    const {id} = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [connection, setConnection] = useState<Connection | null>(null);
    const [metrics, setMetrics] = useState<DatabaseMetrics | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>('metrics');
    const [loading, setLoading] = useState(true);
    const [loadingMetrics, setLoadingMetrics] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
    const [confirmDeleteName, setConfirmDeleteName] = useState<string>('');
    const [editingConnection, setEditingConnection] = useState<Connection | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
// Состояния для редактирования пользователя
    const [editingUser, setEditingUser] = useState<any>(null);
    const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);

// Состояния для пагинации пользователей
    const [usersPage, setUsersPage] = useState(1);
    const [usersPageSize, setUsersPageSize] = useState(8);
    const [usersSearchQuery, setUsersSearchQuery] = useState('');
    const [usersSearchTerm, setUsersSearchTerm] = useState('');

// Используем хук с параметрами пагинации
    const {
        users,
        loading: loadingUsers,
        error: usersError,
        total: totalUsers,
        pages: totalUsersPages,
        hasNext: usersHasNext,
        hasPrev: usersHasPrev
    } = useConnectionUsers(
        id ? parseInt(id) : 0,
        usersPage,
        usersPageSize,
        usersSearchTerm || null
    );

    const loadConnection = async () => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            navigate('/login');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/db_connections/${id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData?.detail || `Ошибка: ${response.status}`);
            }
            const data = await response.json();
            setConnection(data);
        } catch (err) {
            console.error('Ошибка загрузки подключения:', err);
            setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
        } finally {
            setLoading(false);
        }
    };

    const loadMetrics = async () => {
        if (!id) return;
        const token = localStorage.getItem('access_token');
        if (!token) {
            navigate('/login');
            return;
        }
        setLoadingMetrics(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/db_connections/${id}/metrics`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData?.detail || `Ошибка: ${response.status}`);
            }
            const data = await response.json();
            setMetrics(data);
        } catch (err) {
            console.error('Ошибка загрузки информации:', err);
            setError(err instanceof Error ? err.message : 'Не удалось загрузить информацию');
        } finally {
            setLoadingMetrics(false);
        }
    };

    useEffect(() => {
        if (id) {
            loadConnection();
        }
    }, [id]);

    useEffect(() => {
        if (activeTab === 'metrics' && !metrics) {
            loadMetrics();
        }
    }, [activeTab]);

// Обработчики для поиска и пагинации пользователей
    const handleUsersSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUsersSearchQuery(e.target.value);
    };

    const handleUsersSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setUsersSearchTerm(usersSearchQuery.trim());
        setUsersPage(1);
    };

    const handleUsersSearchClear = () => {
        setUsersSearchQuery('');
        setUsersSearchTerm('');
        setUsersPage(1);
    };

    const handleUsersPageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalUsersPages) {
            setUsersPage(newPage);
        }
    };

    const handleUsersPageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newSize = parseInt(e.target.value, 10);
        setUsersPageSize(newSize);
        setUsersPage(1);
    };

    const handleUsersFirstPage = () => {
        setUsersPage(1);
    };

    const handleUsersLastPage = () => {
        setUsersPage(totalUsersPages);
    };

// Функция для получения бейджа окружения
    const getEnvironmentBadge = (env: string) => {
        const envLower = env.toLowerCase();
        let colorClass = '';
        let label = env;
        switch (envLower) {
            case 'production':
                colorClass = styles.badge_production;
                label = 'ПРОДАКШЕН';
                break;
            case 'testing':
                colorClass = styles.badge_testing;
                label = 'ТЕСТИРОВАНИЕ';
                break;
            case 'analytics':
                colorClass = styles.badge_analytics;
                label = 'АНАЛИТИКА';
                break;
            case 'development':
            default:
                colorClass = styles.badge_development;
                label = 'РАЗРАБОТКА';
                break;
        }
        return (
            <span className={clsx(styles.badge, colorClass)}>
{label}
</span>
        );
    };

    const getStatusIndicatorClass = (status: string) => {
        const statusLower = status.toLowerCase();
        if (statusLower === 'connected') return styles.statusIndicator_connected;
        if (statusLower === 'error') return styles.statusIndicator_error;
        return styles.statusIndicator_unknown;
    };

// Форматирование времени работы
    const formatUptime = (uptimeStr: string): string => {
        if (!uptimeStr || uptimeStr === '—') return '—';
        if (uptimeStr.includes('day')) {
            try {
                const parts = uptimeStr.split(' ');
                const days = parseInt(parts[0], 10) || 0;
                const timePart = parts[2] || '00:00:00';
                const [hoursStr, minutes, seconds] = timePart.split(':');
                const totalHours = days * 24 + (parseInt(hoursStr, 10) || 0);
                return `${totalHours.toString().padStart(2, '0')}:${minutes}:${seconds}`;
            } catch (e) {
                console.error('Ошибка форматирования времени работы:', e);
                return uptimeStr;
            }
        }
        if (/^\d+:\d+:\d+$/.test(uptimeStr.trim())) {
            return uptimeStr.trim();
        }
        return uptimeStr;
    };

// Форматирование времени начала работы
    const formatStartTime = (startTimeStr: string): string => {
        if (!startTimeStr || startTimeStr === '—') return '—';
        try {
            const cleanStr = startTimeStr.replace(/ [+-]\d{2}(:\d{2})?$/, '').trim();
            const [datePart, timePart] = cleanStr.split(' ');
            if (!datePart || !timePart) return startTimeStr;
            const [year, month, day] = datePart.split('-');
            return `${day}.${month}.${year} ${timePart}`;
        } catch (e) {
            console.error('Ошибка форматирования времени начала работы:', e);
            return startTimeStr;
        }
    };

    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleString('ru-RU', {
                year: 'numeric',
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            });
        } catch (e) {
            return dateString;
        }
    };

    const openDeleteConfirm = (connectionId: number, connectionName: string) => {
        setConfirmDeleteId(connectionId);
        setConfirmDeleteName(connectionName);
    };

    const closeDeleteConfirm = () => {
        setConfirmDeleteId(null);
        setConfirmDeleteName('');
    };

    const deleteConnection = async () => {
        if (!confirmDeleteId) return;
        const token = localStorage.getItem('access_token');
        if (!token) {
            navigate('/login');
            closeDeleteConfirm();
            return;
        }
        setDeletingId(confirmDeleteId);
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/db_connections/${confirmDeleteId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData?.detail || 'Не удалось удалить подключение');
            }
            navigate('/connections');
        } catch (err) {
            console.error('Ошибка при удалении подключения:', err);
            setError(err instanceof Error ? err.message : 'Не удалось удалить подключение');
            closeDeleteConfirm();
        } finally {
            setDeletingId(null);
        }
    };

    const openEditModal = () => {
        if (connection) {
            setEditingConnection(connection);
            setIsEditModalOpen(true);
        }
    };

    const closeEditModal = () => {
        setIsEditModalOpen(false);
        setEditingConnection(null);
    };

    const handleEditSuccess = () => {
        closeEditModal();
        loadConnection();
    };

// Открытие модального окна редактирования пользователя
    const openEditUserModal = (user: any) => {
        setEditingUser(user);
        setIsEditUserModalOpen(true);
    };

// Закрытие модального окна редактирования пользователя
    const closeEditUserModal = () => {
        setIsEditUserModalOpen(false);
        setEditingUser(null);
    };

// Обработчик успешного редактирования пользователя
    const handleEditUserSuccess = () => {
        closeEditUserModal();
// Перезагружаем список пользователей
        setUsersPage(1);
        setUsersSearchTerm('');
    };

    if (loading) {
        return (
            <section className={clsx(styles.connectionDetail)}>
                <div className="container">
                    <div className={clsx(styles.connectionDetail__section)}>
                        <div className={clsx(styles.connectionDetail__loading)}>
                            <div className={clsx(styles.spinner)}>
                                <FontAwesomeIcon icon={faSpinner} spin size="3x"/>
                            </div>
                            <p>Загрузка подключения...</p>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    if (error || !connection) {
        return (
            <section className={clsx(styles.connectionDetail)}>
                <div className="container">
                    <div className={clsx(styles.connectionDetail__section)}>
                        <div className={clsx(styles.connectionDetail__error)}>
                            <FontAwesomeIcon icon={faExclamationCircle} size="3x"/>
                            <p>{error || 'Подключение не найдено'}</p>
                            <button
                                className={clsx(styles.retryButton)}
                                onClick={() => navigate('/connections')}
                            >
                                Вернуться к списку
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    const getMetricValue = (metricKey: string, defaultValue: string = '—') => {
        if (!metrics) return defaultValue;
        const metric = metrics.basic_metrics.find(m => m.metric === metricKey);
        return metric ? metric.value : defaultValue;
    };

    return (
        <section className={clsx(styles.connectionDetail)}>
            <div className="container">
                <div className={clsx(styles.connectionDetail__section)}>
                    <div className={clsx(styles.connectionCard)}>
                        <div className={clsx(styles.cardHeader)}>
                            <div className={clsx(styles.cardIconContainer)}>
                                <FontAwesomeIcon
                                    icon={faDatabase}
                                    className={clsx(styles.cardIcon)}
                                />
                                <div
                                    className={clsx(
                                        styles.statusIndicator,
                                        getStatusIndicatorClass(connection.status)
                                    )}
                                    title={connection.status}
                                ></div>
                            </div>
                            <div className={clsx(styles.cardHeaderContent)}>
                                <div className={clsx(styles.cardTitleRow)}>
                                    <div className={clsx(styles.cardTitle)}>
                                        {connection.database_type.toUpperCase()}
                                    </div>
                                    <div className={clsx(styles.cardEnv)}>
                                        {getEnvironmentBadge(connection.environment)}
                                    </div>
                                </div>
                                <div className={clsx(styles.cardName)}>
                                    {connection.name || 'Без имени'}
                                </div>
                                <div
                                    className={clsx(styles.cardDescription)}
                                    title={connection.description || ''}
                                >
                                    {connection.description
                                        ? (connection.description.length > 50
                                            ? connection.description.slice(0, 50) + '...'
                                            : connection.description)
                                        : ''}
                                </div>
                            </div>
                        </div>
                        <div className={clsx(styles.tabsContainer)}>
                            <button
                                className={clsx(
                                    styles.tabButton,
                                    activeTab === 'metrics' && styles.tabButton_active
                                )}
                                onClick={() => setActiveTab('metrics')}
                            >
                                <FontAwesomeIcon icon={faChartBar}/>
                                Информация
                            </button>
                            <button
                                className={clsx(
                                    styles.tabButton,
                                    activeTab === 'extensions' && styles.tabButton_active
                                )}
                                onClick={() => setActiveTab('extensions')}
                            >
                                <FontAwesomeIcon icon={faCogs}/>
                                Расширения
                            </button>
                            <button
                                className={clsx(
                                    styles.tabButton,
                                    activeTab === 'users' && styles.tabButton_active
                                )}
                                onClick={() => {
                                    setActiveTab('users');
// Сбрасываем поиск при переключении на вкладку
                                    setUsersSearchQuery('');
                                    setUsersSearchTerm('');
                                    setUsersPage(1);
                                }}
                            >
                                <FontAwesomeIcon icon={faUser}/>
                                Пользователи
                            </button>
                        </div>
                        <div className={clsx(styles.tabContent)}>
                            {activeTab === 'metrics' && (
                                <div className={clsx(styles.metricsContent)}>
                                    {loadingMetrics ? (
                                        <div className={clsx(styles.metricsLoading)}>
                                            <div className={clsx(styles.spinner)}>
                                                <FontAwesomeIcon icon={faSpinner} spin size="2x"/>
                                            </div>
                                            <p>Загрузка информации...</p>
                                        </div>
                                    ) : metrics && metrics.basic_metrics.length > 0 ? (
                                        <>
                                            <div className={clsx(styles.metricsGrid)}>
                                                {/* Общая информация */}
                                                <div className={clsx(styles.metricsCard)}>
                                                    <div className={clsx(styles.metricsCardHeader)}>
                                                        <FontAwesomeIcon icon={faDatabase} className={clsx(styles.metricsCardIcon)}/>
                                                        <h3 className={clsx(styles.metricsCardTitle)}>Общая информация</h3>
                                                    </div>
                                                    <div className={clsx(styles.metricsCardContent)}>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>База данных:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{connection.database_name || '—'}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Хост:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{connection.host || '—'}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Порт:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{connection.port || '—'}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Пользователь:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{connection.username || '—'}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Размер базы данных:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('db_size', '—')}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Версия СУБД:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('server_version', '—')}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Кодировка:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('client_encoding', '—')}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Авто очистка:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('autovacuum', '—')}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Логирование:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('log_statement_stats', '—')}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Коллация:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('database_collation', '—')}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Буфер:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('shared_buffers', '—')}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Рабочая память:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('work_mem', '—')}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Временная зона:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('TimeZone', '—')}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Время работы:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{formatUptime(getMetricValue('server_uptime', '—'))}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Начало работы:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{formatStartTime(getMetricValue('server_start_time', '—'))}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Дата создания подключения:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{formatDate(connection.created_at)}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Структура базы */}
                                                <div className={clsx(styles.metricsCard)}>
                                                    <div className={clsx(styles.metricsCardHeader)}>
                                                        <FontAwesomeIcon icon={faTable} className={clsx(styles.metricsCardIcon)}/>
                                                        <h3 className={clsx(styles.metricsCardTitle)}>Структура базы</h3>
                                                    </div>
                                                    <div className={clsx(styles.metricsCardContent)}>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Количество таблиц:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('table_count', '—')}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Размер таблиц:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('table_size', '—')}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Количество временных таблиц:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('temp_table_count', '—')}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Размер временных таблиц:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('temp_table_size', '—')}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Количество системных таблиц:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('system_table_count', '—')}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Размер системных таблиц:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('system_table_size', '—')}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Количество индексов:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('index_count', '—')}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Размер индексов:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('index_size', '—')}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Количество представлений:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('view_count', '—')}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Материализованных представлений:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('materialized_view_count', '—')}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Хранимых процедур:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('procedure_count', '—')}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Триггеров:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('trigger_count', '—')}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Пользователи и группы */}
                                                <div className={clsx(styles.metricsCard)}>
                                                    <div className={clsx(styles.metricsCardHeader)}>
                                                        <FontAwesomeIcon icon={faUserGroup} className={clsx(styles.metricsCardIcon)}/>
                                                        <h3 className={clsx(styles.metricsCardTitle)}>Пользователи и группы</h3>
                                                    </div>
                                                    <div className={clsx(styles.metricsCardContent)}>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Всего пользователей:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('total_users', '—')}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Всего суперпользователей:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('superuser_count', '—')}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Активных пользователей:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('active_users', '—')}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Количество групп:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('role_count', '—')}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Количество системных групп:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('pg_role_count', '—')}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Максимальное кол-во подключений:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('max_connections', '—')}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Текущих подключений:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('current_connections', '—')}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Кластеризация и репликация */}
                                                <div className={clsx(styles.metricsCard)}>
                                                    <div className={clsx(styles.metricsCardHeader)}>
                                                        <FontAwesomeIcon icon={faNetworkWired} className={clsx(styles.metricsCardIcon)}/>
                                                        <h3 className={clsx(styles.metricsCardTitle)}>Кластеризация и репликация</h3>
                                                    </div>
                                                    <div className={clsx(styles.metricsCardContent)}>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Статус репликации:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{metrics.cluster_replication.length > 0 ? 'Поддерживается' : 'Не поддерживается'}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Задержка репликации:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{metrics.cluster_replication.length > 0 ? metrics.cluster_replication[0].replication_lag : '—'}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Кнопки действий - отображаются ТОЛЬКО на вкладке "Информация" */}
                                            {activeTab === 'metrics' && (
                                                <div className={clsx(styles.cardFooter)}>
                                                    <div className={clsx(styles.cardFooterRight)}>
                                                        <button
                                                            className={clsx(styles.actionButton, styles.actionButton_edit)}
                                                            onClick={openEditModal}
                                                            title="Редактировать подключение"
                                                            disabled={deletingId === connection.id}
                                                        >
                                                            Редактировать
                                                        </button>
                                                        <button
                                                            className={clsx(styles.actionButton, styles.actionButton_delete)}
                                                            onClick={() => openDeleteConfirm(connection.id, connection.name || 'Без имени')}
                                                            title="Удалить подключение"
                                                            disabled={deletingId !== null}
                                                        >
                                                            Удалить
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className={clsx(styles.metricsEmpty)}>
                                            <FontAwesomeIcon icon={faInfoCircle} size="3x"/>
                                            <p>Информация недоступна</p>
                                            {error && <p className={clsx(styles.errorMessage)}>{error}</p>}
                                        </div>
                                    )}
                                </div>
                            )}
                            {activeTab === 'extensions' && (
                                <div className={clsx(styles.extensionsContent)}>
                                    {metrics && metrics.extensions.length > 0 ? (
                                        <div className={clsx(styles.extensionsGrid)}>
                                            {metrics.extensions.map((ext, index) => (
                                                <div key={index} className={clsx(styles.extensionCard)}>
                                                    <div className={clsx(styles.extensionHeader)}>
                                                        <div className={clsx(styles.extensionIcon)}>
                                                            <FontAwesomeIcon icon={faCogs}/>
                                                        </div>
                                                        <div className={clsx(styles.extensionName)}>
                                                            {ext.name}
                                                        </div>
                                                    </div>
                                                    <div className={clsx(styles.extensionVersion)}>
                                                        Версия: <span>{ext.version}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className={clsx(styles.extensionsEmpty)}>
                                            <FontAwesomeIcon icon={faCogs} size="3x"/>
                                            <p>Расширения не найдены</p>
                                        </div>
                                    )}
                                </div>
                            )}
                            {activeTab === 'users' && (
                                <div className={clsx(styles.usersContent)}>
                                    {/* Панель поиска */}
                                    <div className={clsx(styles.usersHeader)}>
                                        <form
                                            onSubmit={handleUsersSearchSubmit}
                                            className={clsx(styles.usersSearchContainer)}
                                        >
                                            <div className={clsx(styles.usersSearchWrapper)}>
                                                <FontAwesomeIcon icon={faSearch} className={clsx(styles.usersSearchIcon)}/>
                                                <input
                                                    type="text"
                                                    placeholder="Поиск пользователей..."
                                                    value={usersSearchQuery}
                                                    onChange={handleUsersSearchInputChange}
                                                    className={clsx(styles.usersSearchInput)}
                                                />
                                                {usersSearchQuery && (
                                                    <button
                                                        type="button"
                                                        onClick={handleUsersSearchClear}
                                                        className={clsx(styles.usersSearchClear)}
                                                        title="Очистить поиск"
                                                    >
                                                        <FontAwesomeIcon icon={faTimes}/>
                                                    </button>
                                                )}
                                            </div>
                                            <button
                                                type="submit"
                                                className={clsx(styles.usersSearchButton)}
                                                title="Найти"
                                            >
                                                Поиск
                                            </button>
                                        </form>
                                    </div>
                                    {loadingUsers ? (
                                        <div className={clsx(styles.usersLoading)}>
                                            <div className={clsx(styles.spinner)}>
                                                <FontAwesomeIcon icon={faSpinner} spin size="2x"/>
                                            </div>
                                            <p>Загрузка пользователей...</p>
                                        </div>
                                    ) : users && users.length > 0 ? (
                                        <>
                                            <div className={clsx(styles.usersList)}>
                                                {users.map((user) => (
                                                    <div key={user.oid} className={clsx(styles.userItem)}>
                                                        <div className={clsx(styles.userItemHeader)}>
                                                            <div className={clsx(styles.userItemHeaderLeft)}>
                                                                <FontAwesomeIcon icon={faUser} className={clsx(styles.userItemIcon)}/>
                                                                <h3 className={clsx(styles.userItemTitle)}>{user.name}</h3>
                                                            </div>
                                                            <div className={clsx(styles.userItemHeaderRight)}>
                                                                {user.description && (
                                                                    <div className={clsx(styles.userItemInfo)}>
                                                                        <span className={clsx(styles.userItemInfoLabel)}>Описание:</span>
                                                                        <span className={clsx(styles.userItemInfoValue)}>{user.description}</span>
                                                                    </div>
                                                                )}
                                                                {user.email && (
                                                                    <div className={clsx(styles.userItemInfo)}>
                                                                        <span className={clsx(styles.userItemInfoLabel)}>Email:</span>
                                                                        <span className={clsx(styles.userItemInfoValue)}>{user.email}</span>
                                                                        <button
                                                                            className={clsx(styles.editEmailButton)}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                openEditUserModal(user);
                                                                            }}
                                                                            title="Редактировать пользователя"
                                                                        >
                                                                            <FontAwesomeIcon icon={faPencilAlt}/>
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>


                                            {/* Пагинация */}
                                            {totalUsers > 0 && (
                                                <div className={clsx(styles.usersPagination)}>
                                                    <div className={clsx(styles.paginationInfo)}>
<span className={clsx(styles.paginationText)}>
Показано <span className={clsx(styles.paginationHighlight)}>{((usersPage - 1) * usersPageSize) + 1}</span>–
<span className={clsx(styles.paginationHighlight)}>{Math.min(usersPage * usersPageSize, totalUsers)}</span> из <span className={clsx(styles.paginationHighlight)}>{totalUsers}</span> пользователей
</span>
                                                    </div>
                                                    <div className={clsx(styles.paginationControls)}>
                                                        <select
                                                            value={usersPageSize}
                                                            onChange={handleUsersPageSizeChange}
                                                            className={clsx(styles.paginationSelect)}
                                                        >
                                                            {PAGE_SIZES.map((size) => (
                                                                <option key={size} value={size}>
                                                                    {size} на странице
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <div className={clsx(styles.paginationButtons)}>
                                                            <button
                                                                className={clsx(styles.paginationButton, styles.paginationButton_first)}
                                                                onClick={handleUsersFirstPage}
                                                                disabled={usersPage === 1 || !usersHasPrev}
                                                                title="Первая страница"
                                                            >
                                                                <FontAwesomeIcon icon={faChevronCircleLeft}/>
                                                            </button>
                                                            <button
                                                                className={clsx(styles.paginationButton)}
                                                                onClick={() => handleUsersPageChange(usersPage - 1)}
                                                                disabled={usersPage === 1 || !usersHasPrev}
                                                                title="Предыдущая страница"
                                                            >
                                                                <FontAwesomeIcon icon={faChevronLeft}/>
                                                            </button>
                                                            <span className={clsx(styles.pageInfo)}>
Страница {usersPage} из {totalUsersPages}
</span>
                                                            <button
                                                                className={clsx(styles.paginationButton)}
                                                                onClick={() => handleUsersPageChange(usersPage + 1)}
                                                                disabled={usersPage === totalUsersPages || !usersHasNext}
                                                                title="Следующая страница"
                                                            >
                                                                <FontAwesomeIcon icon={faChevronRight}/>
                                                            </button>
                                                            <button
                                                                className={clsx(styles.paginationButton, styles.paginationButton_last)}
                                                                onClick={handleUsersLastPage}
                                                                disabled={usersPage === totalUsersPages || !usersHasNext}
                                                                title="Последняя страница"
                                                            >
                                                                <FontAwesomeIcon icon={faChevronCircleRight}/>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className={clsx(styles.usersEmpty)}>
                                            <FontAwesomeIcon icon={faUsers} size="3x"/>
                                            <p>Пользователи не найдены</p>
                                            {usersError && <p className={clsx(styles.errorMessage)}>{usersError}</p>}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {/* Модальное окно подтверждения удаления */}
            {confirmDeleteId !== null && (
                <div className={clsx(styles.modalOverlay)} onClick={closeDeleteConfirm}>
                    <div
                        className={clsx(styles.modalContent)}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={clsx(styles.modalHeader)}>
                            <FontAwesomeIcon
                                icon={faExclamationCircle}
                                className={clsx(styles.modalIcon)}
                            />
                            <h2 className={clsx(styles.modalTitle)}>
                                Подтверждение удаления
                            </h2>
                        </div>
                        <div className={clsx(styles.modalBody)}>
                            <p className={clsx(styles.modalText)}>
                                Удалить подключение <strong>{confirmDeleteName}</strong>?
                            </p>
                            <p className={clsx(styles.modalWarning)}>
                                <FontAwesomeIcon icon={faExclamationCircle}/>
                                Все данные будут удалены безвозвратно.
                            </p>
                        </div>
                        <div className={clsx(styles.modalFooter)}>
                            <button
                                className={clsx(styles.modalCancelButton)}
                                onClick={closeDeleteConfirm}
                                disabled={deletingId !== null}
                            >
                                Отмена
                            </button>
                            <button
                                className={clsx(
                                    styles.modalDeleteButton,
                                    deletingId !== null && styles.modalDeleteButton_loading
                                )}
                                onClick={deleteConnection}
                                disabled={deletingId !== null}
                            >
                                {deletingId !== null ? (
                                    <>
                                        <FontAwesomeIcon icon={faSpinner} spin/>
                                        Удаление...
                                    </>
                                ) : (
                                    <>
                                        <FontAwesomeIcon icon={faTrashAlt}/>
                                        Удалить
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Модальное окно редактирования подключения */}
            {isEditModalOpen && editingConnection && (
                <EditConnectionModal
                    connection={editingConnection}
                    onClose={closeEditModal}
                    onSuccess={handleEditSuccess}
                />
            )}
            {/* Модальное окно редактирования пользователя */}
            {isEditUserModalOpen && editingUser && (
                <EditUserModal
                    connectionId={parseInt(id || '0')}
                    user={editingUser}
                    onClose={closeEditUserModal}
                    onSuccess={handleEditUserSuccess}
                />
            )}
        </section>
    );
}