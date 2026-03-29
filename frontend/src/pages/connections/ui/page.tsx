// frontend/src/pages/connections/ui/page.tsx
import clsx from 'clsx';
import {useState, useEffect, useRef} from 'react';
import styles from './styles.module.scss';
import {useNavigate} from 'react-router';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
    faDatabase,
    faStar,
    faSpinner,
    faExclamationCircle,
    faSearch,
    faTimes,
    faChevronLeft,
    faChevronRight,
    faPencilAlt,
    faTrashAlt,
    faEye,
    faCodeBranch,
    faUser,
    faPlug,
    faHdd,
    faChevronCircleRight,
    faChevronCircleLeft,
    faRefresh, // ✅ Добавлен импорт иконки обновления
} from '@fortawesome/free-solid-svg-icons';
import {EditConnectionModal} from './EditConnectionModal';
import {CreateConnectionModal} from './CreateConnectionModal';
import {CONNECTIONS_PAGE_SIZES} from '@pages/connections/model/page-constants';
import type {Connection, ConnectionsTab} from '@pages/connections/model/page-types';
import {fetchConnections, patchConnectionFavorite, removeConnection} from '@pages/connections/lib/page-api';

export default function ConnectionsPage() {
    const navigate = useNavigate();

    // Состояния
    const [connections, setConnections] = useState<Connection[]>([]);
    const [loading, setLoading] = useState(true);
    const [gridLoading, setGridLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(8);
    const [activeTab, setActiveTab] = useState<ConnectionsTab>('Все');
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [hasNext, setHasNext] = useState(false);
    const [hasPrev, setHasPrev] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
    const [confirmDeleteName, setConfirmDeleteName] = useState<string>('');
    const [refreshing, setRefreshing] = useState(false); // ✅ Состояние для индикатора обновления

    // Состояния для редактирования
    const [editingConnection, setEditingConnection] = useState<Connection | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Состояния для создания
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const hasLoadedOnceRef = useRef(false);

    const PAGE_SIZES = CONNECTIONS_PAGE_SIZES;

    // Загрузка подключений
    const loadConnections = async () => {
        if (hasLoadedOnceRef.current) {
            setGridLoading(true);
        } else {
            setLoading(true);
        }
        setError(null);

        try {
            const data = await fetchConnections({
                page: currentPage,
                size: pageSize,
                search: searchTerm,
                activeTab,
            });

            setConnections(data.items);
            setTotalItems(data.total);
            setTotalPages(data.pages);
            setHasNext(data.has_next);
            setHasPrev(data.has_prev);
        } catch (err) {
            if (err instanceof Error && err.message.includes('не авторизован')) {
                navigate('/login');
                return;
            }
            console.error('Ошибка загрузки подключений:', err);
            setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
        } finally {
            setLoading(false);
            setGridLoading(false);
            setRefreshing(false);
            hasLoadedOnceRef.current = true;
        }
    };

    useEffect(() => {
        loadConnections();
    }, [currentPage, pageSize, searchTerm, activeTab]);

    // ✅ Обработчик обновления страницы
    const handleRefresh = async () => {
        setRefreshing(true);
        await loadConnections();
    };

    // Обработчики
    const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSearchTerm(searchQuery.trim());
        setCurrentPage(1);
    };

    const handleSearchClear = () => {
        setSearchQuery('');
        setSearchTerm('');
        setCurrentPage(1);
    };

    const handleTabChange = (tab: ConnectionsTab) => {
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

    const handleFirstPage = () => {
        setCurrentPage(1);
    };

    const handleLastPage = () => {
        setCurrentPage(totalPages);
    };

    const handleConnectionClick = (connectionId: number) => {
        navigate(`/connections/${connectionId}`);
    };

    // Открытие модального окна подтверждения удаления
    const openDeleteConfirm = (connectionId: number, connectionName: string) => {
        setConfirmDeleteId(connectionId);
        setConfirmDeleteName(connectionName);
    };

    // Закрытие модального окна удаления
    const closeDeleteConfirm = () => {
        setConfirmDeleteId(null);
        setConfirmDeleteName('');
    };

    // Удаление подключения
    const deleteConnection = async () => {
        if (!confirmDeleteId) return;

        setDeletingId(confirmDeleteId);

        try {
            await removeConnection(confirmDeleteId);
            loadConnections();
            closeDeleteConfirm();
        } catch (err) {
            if (err instanceof Error && err.message.includes('не авторизован')) {
                navigate('/login');
                closeDeleteConfirm();
                return;
            }
            console.error('Ошибка при удалении подключения:', err);
            setError(err instanceof Error ? err.message : 'Не удалось удалить подключение');
            closeDeleteConfirm();
        } finally {
            setDeletingId(null);
        }
    };

    // Переключение избранного с оптимистичным обновлением UI
    const toggleFavorite = async (connectionId: number, isFavorite: boolean) => {
        const nextFavoriteState = !isFavorite;

        setConnections((prev) => {
            if (activeTab === 'Избранные' && !nextFavoriteState) {
                return prev.filter((conn) => conn.id !== connectionId);
            }

            return prev.map((conn) =>
                conn.id === connectionId
                    ? {...conn, is_favorite: nextFavoriteState}
                    : conn,
            );
        });

        try {
            await patchConnectionFavorite(connectionId, nextFavoriteState);

            if (activeTab === 'Избранные') {
                await loadConnections();
            }
        } catch (err) {
            setConnections((prev) =>
                prev.map((conn) =>
                    conn.id === connectionId
                        ? {...conn, is_favorite: isFavorite}
                        : conn,
                ),
            );

            if (err instanceof Error && err.message.includes('не авторизован')) {
                navigate('/login');
                return;
            }
            console.error('Ошибка при изменении статуса избранного:', err);
            setError('Не удалось обновить статус избранного');
        }
    };

    // Открытие модального окна редактирования
    const openEditModal = (connection: Connection) => {
        setEditingConnection(connection);
        setIsEditModalOpen(true);
    };

    // Закрытие модального окна редактирования
    const closeEditModal = () => {
        setIsEditModalOpen(false);
        setEditingConnection(null);
    };

    // Обработчик успешного редактирования
    const handleEditSuccess = () => {
        closeEditModal();
        loadConnections();
    };

    // Открытие модального окна создания
    const openCreateModal = () => {
        setIsCreateModalOpen(true);
    };

    // Закрытие модального окна создания
    const closeCreateModal = () => {
        setIsCreateModalOpen(false);
    };

    // Обработчик успешного создания
    const handleCreateSuccess = () => {
        closeCreateModal();
        loadConnections();
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

    if (loading && !hasLoadedOnceRef.current) {
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

    if (error && !hasLoadedOnceRef.current) {
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
                    {/* Заголовок и действия на одном уровне */}
                    <div className={clsx(styles.connections__header)}>
                        <div className={clsx(styles.connections__titleContainer)}>
                            <h1 className={clsx(styles.connections__title)}>
                                Подключения
                                <span className={clsx(styles.profile__usernameBadge)}>
                  {totalItems}
                </span>
                            </h1>
                        </div>
                        <div className={clsx(styles.connections__headerActions)}>
                            <form
                                onSubmit={handleSearchSubmit}
                                className={clsx(styles.connections__searchContainer)}
                            >
                                <div className={clsx(styles.connections__searchWrapper)}>
                                    <FontAwesomeIcon icon={faSearch} className={clsx(styles.connections__searchIcon)}/>
                                    <input
                                        type="text"
                                        placeholder="Поиск подключений..."
                                        value={searchQuery}
                                        onChange={handleSearchInputChange}
                                        className={clsx(styles.connections__searchInput)}
                                    />
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            onClick={handleSearchClear}
                                            className={clsx(styles.connections__searchClear)}
                                            title="Очистить поиск"
                                        >
                                            <FontAwesomeIcon icon={faTimes}/>
                                        </button>
                                    )}
                                </div>
                                <button
                                    type="submit"
                                    className={clsx(styles.searchButton)}
                                    title="Найти"
                                >
                                    Поиск
                                </button>
                            </form>

                            <button
                                className={clsx(styles.addButton)}
                                onClick={openCreateModal}
                                aria-label="Создать новое подключение к базе данных"
                            >
                                Создать подключение
                            </button>

                            {/* ✅ Кнопка обновления */}
                            <button
                                className={clsx(styles.refreshButton, refreshing && styles.refreshButton_loading)}
                                onClick={handleRefresh}
                                disabled={refreshing || loading || gridLoading}
                                aria-label="Обновить список подключений"
                                title="Обновить список подключений"
                            >
                                <FontAwesomeIcon
                                    icon={faRefresh}
                                    spin={refreshing}
                                />
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

                    {error && hasLoadedOnceRef.current && (
                        <div className={clsx(styles.connections__error)}>
                            <FontAwesomeIcon icon={faExclamationCircle}/>
                            <p>{error}</p>
                            <button
                                className={clsx(styles.retryButton)}
                                onClick={() => loadConnections()}
                            >
                                Попробовать снова
                            </button>
                        </div>
                    )}

                    {/* Список подключений */}
                    {connections.length > 0 ? (
                        <div className={clsx(styles.connections__list)}>
                            <div className={clsx(styles.grid)}>
                                {gridLoading ? (
                                    <div className={clsx(styles.connections__loading)}>
                                        <div className={clsx(styles.spinner)}>
                                            <FontAwesomeIcon icon={faSpinner} spin size="2x"/>
                                        </div>
                                        <p>Обновление списка подключений...</p>
                                    </div>
                                ) : filteredConnections.map((connection) => (
                                    <div
                                        key={connection.id}
                                        className={clsx(styles.connectionCard)}
                                    >
                                        <div className={clsx(styles.cardHeader)}>
                                            <div
                                                className={clsx(styles.cardIconContainer)}
                                                role="button"
                                                tabIndex={0}
                                                title="Постмотреть подключению"
                                                onClick={() => handleConnectionClick(connection.id)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        handleConnectionClick(connection.id);
                                                    }
                                                }}
                                            >
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
                                                        ? (connection.description.length > 30
                                                            ? connection.description.slice(0, 30) + '...'
                                                            : connection.description)
                                                        : ''}
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
                                                            disabled={deletingId === connection.id}
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
                                                            disabled={deletingId === connection.id}
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
                                                                openEditModal(connection);
                                                            }}
                                                            title="Редактировать подключение"
                                                            disabled={deletingId === connection.id}
                                                        >
                                                            <FontAwesomeIcon
                                                                icon={faPencilAlt}
                                                                className={clsx(styles.actionIcon)}
                                                            />
                                                        </button>
                                                        <button
                                                            className={clsx(
                                                                styles.actionButton,
                                                                styles.actionButton_delete
                                                            )}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openDeleteConfirm(connection.id, connection.name || 'Без имени');
                                                            }}
                                                            title="Удалить подключение"
                                                            disabled={deletingId !== null}
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
                            {totalItems > 0 && (
                                <div className={clsx(styles.pagination)}>
                                    <div className={clsx(styles.paginationInfo)}>
                    <span className={clsx(styles.paginationText)}>
                      Показано <span className={clsx(styles.paginationHighlight)}>{((currentPage - 1) * pageSize) + 1}</span>–
                      <span className={clsx(styles.paginationHighlight)}>{Math.min(currentPage * pageSize, totalItems)}</span> из <span className={clsx(styles.paginationHighlight)}>{totalItems}</span> подключений
                    </span>
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
                                                className={clsx(styles.paginationButton, styles.paginationButton_first)}
                                                onClick={handleFirstPage}
                                                disabled={currentPage === 1 || !hasPrev}
                                                title="Первая страница"
                                            >
                                                <FontAwesomeIcon icon={faChevronCircleLeft}/>
                                            </button>
                                            <button
                                                className={clsx(styles.paginationButton)}
                                                onClick={() => handlePageChange(currentPage - 1)}
                                                disabled={currentPage === 1 || !hasPrev}
                                                title="Предыдущая страница"
                                            >
                                                <FontAwesomeIcon icon={faChevronLeft}/>
                                            </button>
                                            <span className={clsx(styles.pageInfo)}>
                        Страница {currentPage} из {totalPages}
                      </span>
                                            <button
                                                className={clsx(styles.paginationButton)}
                                                onClick={() => handlePageChange(currentPage + 1)}
                                                disabled={currentPage === totalPages || !hasNext}
                                                title="Следующая страница"
                                            >
                                                <FontAwesomeIcon icon={faChevronRight}/>
                                            </button>
                                            <button
                                                className={clsx(styles.paginationButton, styles.paginationButton_last)}
                                                onClick={handleLastPage}
                                                disabled={currentPage === totalPages || !hasNext}
                                                title="Последняя страница"
                                            >
                                                <FontAwesomeIcon icon={faChevronCircleRight}/>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className={clsx(styles.emptyState)}>
                            <h3>Подключения не найдены</h3>
                            {searchTerm ? (
                                <p>По вашему запросу "{searchTerm}" ничего не найдено</p>
                            ) : (
                                <p>У вас пока нет подключений к базам данных</p>
                            )}
                            <button
                                className={clsx(styles.emptyButton)}
                                onClick={openCreateModal}
                                aria-label="Создать подключение"
                            >
                                Создать подключение
                            </button>
                        </div>
                    )}
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

            {/* Модальное окно редактирования */}
            {isEditModalOpen && editingConnection && (
                <EditConnectionModal
                    connection={editingConnection}
                    onClose={closeEditModal}
                    onSuccess={handleEditSuccess}
                />
            )}

            {/* Модальное окно создания */}
            {isCreateModalOpen && (
                <CreateConnectionModal
                    onClose={closeCreateModal}
                    onSuccess={handleCreateSuccess}
                />
            )}
        </section>
    );
}
