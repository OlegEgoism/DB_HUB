// frontend/src/pages/connections/ui/page.tsx
import clsx from 'clsx';
import {useState, useEffect} from 'react';
import styles from './styles.module.scss';
import {useNavigate} from 'react-router';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
    faDatabase,
    faStar,
    faSpinner,
    faExclamationCircle,
    faSearch,
    faChevronLeft,
    faChevronRight,
    faPlus,
    faPencilAlt,
    faTrashAlt,
    faEye,
    faCodeBranch,
    faUser,
    faPlug,
    faHdd,
} from '@fortawesome/free-solid-svg-icons';

interface Connection {
    id: number;
    database_name: string;
    description: string;
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
    db_size_mb: number;
    created_at: string;
    updated_at: string;
}

interface ConnectionsResponse {
    items: Connection[];
    total: number;
    page: number;
    size: number;
    pages: number;
    has_next: boolean;
    has_prev: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export default function ConnectionsPage() {
    const navigate = useNavigate();

    // Состояния
    const [connections, setConnections] = useState<Connection[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(8);
    const [activeTab, setActiveTab] = useState('Все');
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const PAGE_SIZES = [4, 8, 16, 32];

    // Загрузка подключений
    const loadConnections = async () => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            navigate('/login');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            params.append('page', currentPage.toString());
            params.append('size', pageSize.toString());
            if (searchQuery.trim()) {
                params.append('search', searchQuery.trim());
            }

            // Фильтрация по табам
            if (activeTab !== 'Все') {
                if (activeTab === 'Избранные') {
                    params.append('is_favorite', 'true');
                } else if (activeTab === 'Продакшн') {
                    params.append('environment', 'production');
                } else if (activeTab === 'Разработка') {
                    params.append('environment', 'development');
                } else if (activeTab === 'Тестирование') {
                    params.append('environment', 'testing');
                } else if (activeTab === 'Аналитика') {
                    params.append('environment', 'analytics');
                }
            }

            const response = await fetch(`${API_BASE_URL}/api/v1/db_connections?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData?.detail || `Ошибка: ${response.status}`);
            }

            const data: ConnectionsResponse = await response.json();
            setConnections(data.items);
            setTotalItems(data.total);
            setTotalPages(data.pages);
        } catch (err) {
            console.error('Ошибка загрузки подключений:', err);
            setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadConnections();
    }, [currentPage, pageSize, searchQuery, activeTab]);

    // Обработчики
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        setCurrentPage(1);
    };

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        setCurrentPage(1);
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newSize = parseInt(e.target.value, 10);
        setPageSize(newSize);
        setCurrentPage(1);
    };

    const handleConnectionClick = (connectionId: number) => {
        navigate(`/connections/${connectionId}`);
    };

    const toggleFavorite = async (connectionId: number, isFavorite: boolean) => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            navigate('/login');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/db_connections/${connectionId}/favorite`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({is_favorite: !isFavorite}),
            });

            if (!response.ok) {
                throw new Error('Не удалось обновить статус избранного');
            }

            // Обновляем список подключений
            loadConnections();
        } catch (err) {
            console.error('Ошибка при изменении статуса избранного:', err);
            setError('Не удалось обновить статус избранного');
        }
    };

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

    const formatSize = (sizeMb: number | null | undefined) => {
        if (sizeMb === null || sizeMb === undefined || sizeMb === 0) return '—';
        if (sizeMb < 1024) return `${sizeMb.toFixed(1)} MB`;
        return `${(sizeMb / 1024).toFixed(1)} ГБ`;
    };

    // Фильтрация подключений по активному табу
    const filteredConnections = connections;

    if (loading) {
        return (
            <section className={clsx(styles.connections)}>
                <div className="container">
                    <div className={clsx(styles.connections__section)}>
                        <div className={clsx(styles.connections__loading)}>
                            <div className={clsx(styles.spinner)}>
                                <FontAwesomeIcon icon={faSpinner} spin size="3x"/>
                            </div>
                            <p>Загрузка подключений...</p>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    if (error) {
        return (
            <section className={clsx(styles.connections)}>
                <div className="container">
                    <div className={clsx(styles.connections__section)}>
                        <div className={clsx(styles.connections__error)}>
                            <FontAwesomeIcon icon={faExclamationCircle} size="3x"/>
                            <p>{error}</p>
                            <button
                                className={clsx(styles.retryButton)}
                                onClick={() => loadConnections()}
                            >
                                Попробовать снова
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className={clsx(styles.connections)}>
            <div className="container">
                <div className={clsx(styles.connections__section)}>
                    <div className={clsx(styles.connections__header)}>
                        <div className={clsx(styles.connections__titleContainer)}>
                            <h1 className={clsx(styles.connections__title)}>
                                Подключения
                                <span className={clsx(styles.profile__usernameBadge)}>
                                    {connections.length}
                                </span>
                            </h1>
                        </div>
                        <div className={clsx(styles.connections__headerActions)}>
                            <div className={clsx(styles.connections__searchContainer)}>
                                <div className={clsx(styles.connections__searchWrapper)}>
                                    <FontAwesomeIcon icon={faSearch} className={clsx(styles.connections__searchIcon)}/>
                                    <input
                                        type="text"
                                        placeholder="Поиск подключений..."
                                        value={searchQuery}
                                        onChange={handleSearchChange}
                                        className={clsx(styles.connections__searchInput)}
                                    />
                                </div>
                            </div>
                            <button className={clsx(styles.addButton)}>
                                <FontAwesomeIcon icon={faPlus}/>
                                Создать подключение
                            </button>
                        </div>
                    </div>

                    {/* Фильтры */}
                    <div className={clsx(styles.tabContainer)}>
                        <div
                            className={clsx(
                                styles.tab,
                                activeTab === 'Все' && styles.tab_active
                            )}
                            onClick={() => handleTabChange('Все')}
                        >
                            Все
                        </div>
                        <div
                            className={clsx(
                                styles.tab,
                                activeTab === 'Продакшн' && styles.tab_active
                            )}
                            onClick={() => handleTabChange('Продакшн')}
                        >
                            Продакшн
                        </div>
                        <div
                            className={clsx(
                                styles.tab,
                                activeTab === 'Разработка' && styles.tab_active
                            )}
                            onClick={() => handleTabChange('Разработка')}
                        >
                            Разработка
                        </div>
                        <div
                            className={clsx(
                                styles.tab,
                                activeTab === 'Тестирование' && styles.tab_active
                            )}
                            onClick={() => handleTabChange('Тестирование')}
                        >
                            Тестирование
                        </div>
                        <div
                            className={clsx(
                                styles.tab,
                                activeTab === 'Аналитика' && styles.tab_active
                            )}
                            onClick={() => handleTabChange('Аналитика')}
                        >
                            Аналитика
                        </div>
                        <div
                            className={clsx(
                                styles.tab,
                                activeTab === 'Избранные' && styles.tab_active
                            )}
                            onClick={() => handleTabChange('Избранные')}
                        >
                            Избранные
                        </div>
                    </div>

                    {/* Список подключений */}
                    {connections.length > 0 ? (
                        <div className={clsx(styles.connections__list)}>
                            <div className={clsx(styles.grid)}>
                                {filteredConnections.map((connection) => (
                                    <div
                                        key={connection.id}
                                        className={clsx(styles.connectionCard)}
                                    >
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
                                                <div className={clsx(styles.cardDescription)}>
                                                    {connection.description || 'Нет описания'}
                                                </div>
                                            </div>
                                        </div>

                                        <div className={clsx(styles.cardContent)}>
                                            <div className={clsx(styles.cardInfo)}>
                                                <div className={clsx(styles.infoItem)}>
                                                    <div className={clsx(styles.infoLabel)}>
                                                        <FontAwesomeIcon icon={faDatabase} className={clsx(styles.infoIcon)}/>
                                                        БАЗА ДАННЫХ
                                                    </div>
                                                    <div className={clsx(styles.infoValue)}>
                                                        {connection.database_name || '—'}
                                                    </div>
                                                </div>
                                                <div className={clsx(styles.infoItem)}>
                                                    <div className={clsx(styles.infoLabel)}>
                                                        <FontAwesomeIcon icon={faUser} className={clsx(styles.infoIcon)}/>
                                                        ПОЛЬЗОВАТЕЛЬ
                                                    </div>
                                                    <div className={clsx(styles.infoValue)}>
                                                        {connection.username}
                                                    </div>
                                                </div>
                                                <div className={clsx(styles.infoItem)}>
                                                    <div className={clsx(styles.infoLabel)}>
                                                        <FontAwesomeIcon icon={faCodeBranch} className={clsx(styles.infoIcon)}/>
                                                        ХОСТ
                                                    </div>
                                                    <div className={clsx(styles.infoValue)}>
                                                        {connection.host}
                                                    </div>
                                                </div>
                                                <div className={clsx(styles.infoItem)}>
                                                    <div className={clsx(styles.infoLabel)}>
                                                        <FontAwesomeIcon icon={faPlug} className={clsx(styles.infoIcon)}/>
                                                        ПОРТ
                                                    </div>
                                                    <div className={clsx(styles.infoValue)}>
                                                        {connection.port}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className={clsx(styles.cardFooter)}>
                                                <div className={clsx(styles.cardFooterLeft)}>
                                                    <div className={clsx(styles.databaseSize)}>
                                                        <div className={clsx(styles.infoLabel)}>
                                                            <FontAwesomeIcon icon={faHdd} className={clsx(styles.infoIcon)}/>
                                                            РАЗМЕР
                                                        </div>
                                                        <div className={clsx(styles.infoValue)}>
                                                            {formatSize(connection.db_size_mb)}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className={clsx(styles.cardFooterRight)}>
                                                    <div className={clsx(styles.actionButtons)}>
                                                        <button
                                                            className={clsx(styles.actionButton)}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleFavorite(connection.id, connection.is_favorite);
                                                            }}
                                                            title={connection.is_favorite ? "Убрать из избранного" : "Добавить в избранное"}
                                                        >
                                                            <FontAwesomeIcon
                                                                icon={faStar}
                                                                className={clsx(
                                                                    styles.actionIcon,
                                                                    connection.is_favorite && styles.actionIcon_active
                                                                )}
                                                            />
                                                        </button>
                                                        <button
                                                            className={clsx(styles.actionButton)}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleConnectionClick(connection.id);
                                                            }}
                                                            title="Просмотреть подключение"
                                                        >
                                                            <FontAwesomeIcon
                                                                icon={faEye}
                                                                className={clsx(styles.actionIcon)}
                                                            />
                                                        </button>
                                                        <button
                                                            className={clsx(styles.actionButton)}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                // TODO: Implement edit connection
                                                            }}
                                                            title="Редактировать подключение"
                                                        >
                                                            <FontAwesomeIcon
                                                                icon={faPencilAlt}
                                                                className={clsx(styles.actionIcon)}
                                                            />
                                                        </button>
                                                        <button
                                                            className={clsx(styles.actionButton)}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                // TODO: Implement delete connection
                                                            }}
                                                            title="Удалить подключение"
                                                        >
                                                            <FontAwesomeIcon
                                                                icon={faTrashAlt}
                                                                className={clsx(styles.actionIcon)}
                                                            />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Пагинация */}
                            {totalPages > 1 && (
                                <div className={clsx(styles.pagination)}>
                                    <div className={clsx(styles.paginationInfo)}>
                                        Показано {connections.length} из {totalItems} подключений
                                    </div>
                                    <div className={clsx(styles.paginationControls)}>
                                        <select
                                            value={pageSize}
                                            onChange={handlePageSizeChange}
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
                                                className={clsx(styles.paginationButton)}
                                                onClick={() => handlePageChange(currentPage - 1)}
                                                disabled={currentPage === 1}
                                            >
                                                <FontAwesomeIcon icon={faChevronLeft}/>
                                            </button>
                                            <span className={clsx(styles.pageInfo)}>
                        Страница {currentPage} из {totalPages}
                      </span>
                                            <button
                                                className={clsx(styles.paginationButton)}
                                                onClick={() => handlePageChange(currentPage + 1)}
                                                disabled={currentPage === totalPages}
                                            >
                                                <FontAwesomeIcon icon={faChevronRight}/>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className={clsx(styles.emptyState)}>
                            <FontAwesomeIcon icon={faDatabase} size="3x" className={clsx(styles.emptyIcon)}/>
                            <h3>Подключения не найдены</h3>
                            {searchQuery ? (
                                <p>По вашему запросу "{searchQuery}" ничего не найдено</p>
                            ) : (
                                <p>У вас пока нет подключений к базам данных</p>
                            )}
                            <button className={clsx(styles.emptyButton)}>
                                <FontAwesomeIcon icon={faPlus}/>
                                Создать первое подключение
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}