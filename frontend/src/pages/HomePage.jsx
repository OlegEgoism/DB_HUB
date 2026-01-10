// src/pages/HomePage.jsx
import React, {useState, useEffect, useCallback} from 'react';
import {useNavigate} from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

const HomePage = () => {
    const navigate = useNavigate();

    const isAuthenticated = !!localStorage.getItem('access_token');
    const [connections, setConnections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all');
    const [favorites, setFavorites] = useState(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(8); // ← по умолчанию 8
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [connectionToDelete, setConnectionToDelete] = useState(null);

    const connectedCount = connections.filter(conn => conn.status === 'connected').length;

    // ========== Функции ==========

    const openDeleteModal = (conn) => {
        setConnectionToDelete(conn);
        setShowDeleteModal(true);
    };

    const deleteConnection = async () => {
        if (!connectionToDelete) return;
        const token = localStorage.getItem('access_token');
        if (!token) {
            setError('Требуется авторизация');
            setShowDeleteModal(false);
            return;
        }

        try {
            const response = await fetch(`http://localhost:8000/api/v1/db_connections/${connectionToDelete.id}`, {
                method: 'DELETE',
                headers: {'Authorization': `Bearer ${token}`},
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `Ошибка: ${response.status}`);
            }

            setConnections(prev => prev.filter(c => c.id !== connectionToDelete.id));
            setFavorites(prev => {
                const newSet = new Set(prev);
                newSet.delete(connectionToDelete.id);
                return newSet;
            });

            setShowDeleteModal(false);
            setConnectionToDelete(null);
        } catch (err) {
            console.error('Ошибка удаления:', err);
            setError(`Не удалось удалить: ${err.message}`);
            setShowDeleteModal(false);
        }
    };

    const handleEditConnection = useCallback((connectionId) => {
        navigate(`/connections/${connectionId}/edit`);
    }, [navigate]);

    const getDatabaseIconClass = (type) => {
        switch (type?.toLowerCase()) {
            case 'postgresql':
                return 'fa-database';
            default:
                return 'fa-database';
        }
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'connected':
                return 'status-connected';
            case 'connecting':
                return 'status-connecting';
            default:
                return 'status-disconnected';
        }
    };

    const formatDbSize = (sizeMb) => {
        if (sizeMb === null || sizeMb === undefined) return '—';
        if (sizeMb >= 1024) {
            return `${(sizeMb / 1024).toFixed(2)} ГБ`;
        }
        return `${sizeMb.toFixed(2)} МБ`;
    };

    const toggleFavorite = async (connectionId) => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            console.warn('Попытка изменения избранного без авторизации');
            return;
        }

        const newFavorites = new Set(favorites);
        const isCurrentlyFavorite = newFavorites.has(connectionId);
        if (isCurrentlyFavorite) {
            newFavorites.delete(connectionId);
        } else {
            newFavorites.add(connectionId);
        }
        setFavorites(newFavorites);

        try {
            const response = await fetch(`http://localhost:8000/api/v1/db_connections/${connectionId}/favorite`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({is_favorite: !isCurrentlyFavorite}),
            });

            if (!response.ok) {
                setFavorites(favorites);
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `Ошибка: ${response.status}`);
            }
        } catch (err) {
            console.error('Не удалось обновить избранное:', err);
            setError(`Не удалось обновить избранное: ${err.message}`);
        }
    };

    const filteredConnections = connections.filter((conn) => {
        if (filter === 'all') return true;
        if (filter === 'production' && conn.environment === 'production') return true;
        if (filter === 'development' && conn.environment === 'development') return true;
        if (filter === 'testing' && conn.environment === 'testing') return true;
        if (filter === 'analytics' && conn.environment === 'analytics') return true;
        if (filter === 'favorite' && favorites.has(conn.id)) return true;
        return false;
    });

    // ========== Загрузка данных с пагинацией и поиском ==========

    const fetchConnections = async (page, size, search) => {
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('access_token');
            const url = new URL('http://localhost:8000/api/v1/db_connections/');
            url.searchParams.set('page', page);
            url.searchParams.set('size', size);
            if (search?.trim()) {
                url.searchParams.set('search', search.trim());
            }

            const response = await fetch(url.toString(), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            setConnections(data.items || []);
            setTotalPages(data.pages || 1);
            setTotalCount(data.total || 0);

            const initialFavorites = new Set();
            data.items?.forEach(conn => {
                if (conn.is_favorite) {
                    initialFavorites.add(conn.id);
                }
            });
            setFavorites(initialFavorites);
        } catch (err) {
            console.error('Failed to fetch connections:', err);
            setError(err.message || 'Не удалось загрузить подключения');
        } finally {
            setLoading(false);
        }
    };

    // Debounced search + pagination effect
    useEffect(() => {
        if (!isAuthenticated) {
            setLoading(false);
            return;
        }

        const delayDebounce = setTimeout(() => {
            fetchConnections(currentPage, pageSize, searchQuery);
        }, 300);

        return () => clearTimeout(delayDebounce);
    }, [isAuthenticated, searchQuery, currentPage, pageSize]);

    // Сброс страницы при смене поиска
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    // ========== Вспомогательные функции ==========

    const truncateDescription = (desc, length = 30) => {
        if (!desc) return 'Не заполнено';
        return desc.length > length ? desc.substring(0, length) + '...' : desc;
    };

    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const handlePageSizeChange = (e) => {
        const newSize = parseInt(e.target.value, 10);
        setPageSize(newSize);
        setCurrentPage(1);
    };

    // ========== Неавторизованный пользователь ==========
    if (!isAuthenticated) {
        return (
            <>
                <Header isAuthenticated={false}/>
                <main>
                    <section className="dashboard-section">
                        <h1 className="welcome-title">Зарегистрируйтесь или авторизуйтесь в DB HUB</h1>
                        <p className="profile-subtitle">
                            Современная платформа управления базами данных с централизованным доступом и администрированием.
                        </p>
                        <div className="features-grid">
                            <div className="feature-card">
                                <div className="feature-icon">
                                    <i className="fas fa-bolt"></i>
                                </div>
                                <h3 className="feature-title">Производительность</h3>
                                <p className="feature-description">
                                    Оптимизированные подключения к базам данных с минимальной задержкой.
                                </p>
                            </div>
                            <div className="feature-card">
                                <div className="feature-icon">
                                    <i className="fas fa-chart-line"></i>
                                </div>
                                <h3 className="feature-title">Мониторинг</h3>
                                <p className="feature-description">
                                    Детальная аналитика использования баз данных.
                                </p>
                            </div>
                            <div className="feature-card">
                                <div className="feature-icon">
                                    <i className="fas fa-users-cog"></i>
                                </div>
                                <h3 className="feature-title">Управление доступом</h3>
                                <p className="feature-description">
                                    Система ролевой модели для контроля доступа к базам данных.
                                </p>
                            </div>
                            <div className="feature-card">
                                <div className="feature-icon">
                                    <i className="fas fa-code"></i>
                                </div>
                                <h3 className="feature-title">API & Интеграции</h3>
                                <p className="feature-description">
                                    REST API для интеграции с другими системами.
                                </p>
                            </div>
                        </div>
                    </section>
                </main>
                <Footer/>
            </>
        );
    }

    // ========== Авторизованный пользователь ==========
    return (
        <>
            <Header isAuthenticated={true}/>
            <main>
                <section className="connections-section">
                    <div className="section-header">
                        <div className="section-title-container">
                            <h2>Активные подключения</h2>
                            <div className="connections-count">{connectedCount}</div>
                        </div>
                        <div className="section-controls">
                            <div className="section-search-bar">
                                <i className="fas fa-search"></i>
                                <input
                                    type="text"
                                    placeholder="Поиск подключений..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <button className="btn btn-primary">
                                <i className="fas fa-plus"></i> Создать подключение
                            </button>
                        </div>
                    </div>

                    <div className="filters-container">
                        <div className="filter-tabs">
                            <button
                                className={`tab ${filter === 'all' ? 'active' : ''}`}
                                onClick={() => setFilter('all')}
                            >
                                Все
                            </button>
                            <button
                                className={`tab ${filter === 'production' ? 'active' : ''}`}
                                onClick={() => setFilter('production')}
                            >
                                Продакшн
                            </button>
                            <button
                                className={`tab ${filter === 'development' ? 'active' : ''}`}
                                onClick={() => setFilter('development')}
                            >
                                Разработка
                            </button>
                            <button
                                className={`tab ${filter === 'testing' ? 'active' : ''}`}
                                onClick={() => setFilter('testing')}
                            >
                                Тестирование
                            </button>
                            <button
                                className={`tab ${filter === 'analytics' ? 'active' : ''}`}
                                onClick={() => setFilter('analytics')}
                            >
                                Аналитика
                            </button>
                            <button
                                className={`tab ${filter === 'favorite' ? 'active' : ''}`}
                                onClick={() => setFilter('favorite')}
                            >
                                Избранные
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="loading-message">
                            <i className="fas fa-spinner fa-spin"></i> Загрузка подключений...
                        </div>
                    ) : error ? (
                        <div className="error-message">
                            <i className="fas fa-exclamation-circle"></i> Ошибка загрузки: {error}
                        </div>
                    ) : (
                        <>
                            <div className="connections-grid">
                                {filteredConnections.length === 0 ? (
                                    <div className="loading-message">
                                        Нет подключений, соответствующих выбранному фильтру.
                                    </div>
                                ) : (
                                    filteredConnections.map((conn, index) => (
                                        <div key={conn.id} className="connection-card" style={{animationDelay: `${index * 0.1}s`}}>
                                            <div className="card-header">
                                                <div className="connection-title-container">
                                                    <div className="connection-subtitle">
                                                        <div className="connection-meta-row">
                                                            <div className="db-type">
                                                                <div className="db-icon-container">
                                                                    <i className={`fas ${getDatabaseIconClass(conn.database_type)}`}></i>
                                                                    <div className={`${getStatusClass(conn.status)} status-overlay-dot`}>
                                                                        <span className="status-dot"></span>
                                                                    </div>
                                                                </div>
                                                                <span>{conn.database_type?.toUpperCase() || 'UNKNOWN'}</span>
                                                            </div>
                                                        </div>
                                                        <div className="connection-meta-row">
                                                            <div className={`env-badge-inline ${conn.environment || 'development'}`}>
                                                                {conn.environment === 'production' ? 'ПРОДАКШЕН' :
                                                                    conn.environment === 'testing' ? 'ТЕСТИРОВАНИЕ' :
                                                                        conn.environment === 'analytics' ? 'АНАЛИТИКА' : 'РАЗРАБОТКА'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <h2 className="connection-title">{conn.name || 'Без названия'}</h2>
                                                    <h2
                                                        className="connection-description"
                                                        title={conn.description || 'Не заполнено'}
                                                    >
                                                        Описание: {truncateDescription(conn.description)}
                                                    </h2>
                                                </div>
                                            </div>

                                            <div className="card-content">
                                                <div className="info-grid">
                                                    <div className="info-item">
                                                        <div className="info-label">БАЗА ДАННЫХ</div>
                                                        <div className="info-value">
                                                            <i className="fas fa-database"></i>
                                                            <span>{conn.database_name || '—'}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="info-grid">
                                                    <div className="info-item">
                                                        <div className="info-label">ПОЛЬЗОВАТЕЛЬ</div>
                                                        <div className="info-value">
                                                            <i className="fas fa-user"></i>
                                                            <span>{conn.username || '—'}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="info-grid">
                                                    <div className="info-item">
                                                        <div className="info-label">ХОСТ</div>
                                                        <div className="info-value">
                                                            <i className="fas fa-server"></i>
                                                            <span>{conn.host || '—'}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="info-grid">
                                                    <div className="info-item">
                                                        <div className="info-label">ПОРТ</div>
                                                        <div className="info-value">
                                                            <i className="fas fa-plug"></i>
                                                            <span>{conn.port || '—'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="card-footer">
                                                <div className="info-grid">
                                                    <div className="info-item">
                                                        <div className="info-label">РАЗМЕР</div>
                                                        <div className="info-value">
                                                            <i className="fas fa-hdd"></i>
                                                            <span>{formatDbSize(conn.db_size_mb)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="card-actions">
                                                    <button
                                                        className={`favorite-btn ${favorites.has(conn.id) ? 'active' : ''}`}
                                                        onClick={() => toggleFavorite(conn.id)}
                                                        title={favorites.has(conn.id) ? 'Убрать из избранного' : 'Добавить в избранное'}
                                                    >
                                                        <i className="fas fa-star"></i>
                                                    </button>

                                                    <button
                                                        className="action-btn"
                                                        onClick={() => navigate(`/connections/${conn.id}/monitoring`)}
                                                        title="Мониторинг подключения"
                                                    >
                                                        <i className="fas fa-chart-bar"></i>
                                                    </button>

                                                    <button
                                                        className="action-btn"
                                                        onClick={() => handleEditConnection(conn.id)}
                                                        title="Редактировать подключение"
                                                    >
                                                        <i className="fas fa-edit"></i>
                                                    </button>
                                                    <button
                                                        className="action-btn delete"
                                                        onClick={() => openDeleteModal(conn)}
                                                        title="Удалить подключение"
                                                    >
                                                        <i className="fas fa-trash"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Пагинация */}
                            {totalPages > 1 && (
                                <div className="pagination-container">
                                    <div className="pagination-info">
                                        Показано {filteredConnections.length} из {totalCount} подключений
                                    </div>
                                    <div className="pagination-controls">
                                        <select
                                            value={pageSize}
                                            onChange={handlePageSizeChange}
                                            className="pagination-select"
                                        >
                                            <option value={4}>4 на странице</option>
                                            <option value={8}>8 на странице</option>
                                            <option value={16}>16 на странице</option>
                                            <option value={32}>32 на странице</option>
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
                                                Страница {currentPage} из {totalPages}
                                            </span>
                                            <button
                                                className="btn btn-ghost"
                                                onClick={() => handlePageChange(currentPage + 1)}
                                                disabled={currentPage === totalPages}
                                            >
                                                <i className="fas fa-chevron-right"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </section>
            </main>

            {/* Модальное окно подтверждения удаления */}
            {showDeleteModal && (
                <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
                    <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Удаление подключения</h3>
                        </div>
                        <div className="modal-body">
                            <p className="modal-text">
                                Удалит подключение <strong>«{connectionToDelete?.name || 'Без названия'}»</strong> навсегда?
                            </p>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn btn-primary"
                                onClick={() => setShowDeleteModal(false)}
                            >
                                Отмена
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={deleteConnection}
                            >
                                <i className="fas fa-trash"></i> Удалить
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Footer/>
        </>
    );
};

export default HomePage;