// frontend/src/pages/connections/ui/page.tsx
import clsx from 'clsx';
import { useState, useEffect } from 'react';
import styles from './styles.module.scss';
import { useNavigate } from 'react-router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDatabase,
  faStar,
  faSpinner,
  faExclamationCircle,
  faSearch,
  faChevronLeft,
  faChevronRight,
  faPlus,
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

      const response = await fetch(`${API_BASE_URL}/api/v1/db_connections?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Ошибка: ${response.status}`);
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
  }, [currentPage, pageSize, searchQuery]);

  // Обработчики
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
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

  const getDatabaseTypeBadge = (dbType: string) => {
    const typeLower = dbType.toLowerCase();
    let colorClass = '';

    switch (typeLower) {
      case 'postgresql':
        colorClass = styles.badge_postgresql;
        break;
      case 'greenplum':
        colorClass = styles.badge_greenplum;
        break;
      case 'mysql':
        colorClass = styles.badge_mysql;
        break;
      case 'mongodb':
        colorClass = styles.badge_mongodb;
        break;
      default:
        colorClass = styles.badge_default;
    }

    return (
      <span className={clsx(styles.badge, colorClass)}>
        {typeLower.toUpperCase()}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    let colorClass = '';

    switch (statusLower) {
      case 'connected':
        colorClass = styles.status_connected;
        break;
      case 'error':
        colorClass = styles.status_error;
        break;
      case 'disconnected':
        colorClass = styles.status_disconnected;
        break;
      default:
        colorClass = styles.status_unknown;
    }

    return (
      <span className={clsx(styles.statusBadge, colorClass)}>
        {statusLower === 'connected' ? 'Подключено' :
         statusLower === 'error' ? 'Ошибка' :
         statusLower === 'disconnected' ? 'Отключено' : 'Неизвестно'}
      </span>
    );
  };

  const formatSize = (sizeMb: number) => {
    if (sizeMb === 0) return '—';
    if (sizeMb < 1024) return `${sizeMb.toFixed(1)} MB`;
    return `${(sizeMb / 1024).toFixed(1)} GB`;
  };

  if (loading) {
    return (
      <section className={clsx(styles.connections)}>
        <div className="container">
          <div className={clsx(styles.connections__section)}>
            <div className={clsx(styles.connections__loading)}>
              <div className={clsx(styles.spinner)}>
                <FontAwesomeIcon icon={faSpinner} spin size="3x" />
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
              <FontAwesomeIcon icon={faExclamationCircle} size="3x" />
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
            <h1 className={clsx(styles.connections__title)}>
              <FontAwesomeIcon icon={faDatabase} />
              Мои подключения
            </h1>
            <div className={clsx(styles.connections__headerActions)}>
              <button className={clsx(styles.addButton)}>
                <FontAwesomeIcon icon={faPlus} />
                Новое подключение
              </button>
            </div>
          </div>

          {/* Поиск */}
          <div className={clsx(styles.searchContainer)}>
            <div className={clsx(styles.searchWrapper)}>
              <FontAwesomeIcon icon={faSearch} className={clsx(styles.searchIcon)} />
              <input
                type="text"
                placeholder="Поиск по названию, описанию, хосту..."
                value={searchQuery}
                onChange={handleSearchChange}
                className={clsx(styles.searchInput)}
              />
            </div>
          </div>

          {/* Список подключений */}
          {connections.length > 0 ? (
            <div className={clsx(styles.connections__list)}>
              <div className={clsx(styles.tableWrapper)}>
                <table className={clsx(styles.table)}>
                  <thead>
                    <tr>
                      <th>Избранное</th>
                      <th>Название</th>
                      <th>База данных</th>
                      <th>Тип</th>
                      <th>Хост</th>
                      <th>Окружение</th>
                      <th>Статус</th>
                      <th>Размер</th>
                      <th>Владелец</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {connections.map((connection) => (
                      <tr
                        key={connection.id}
                        className={clsx(styles.tableRow)}
                        onClick={() => handleConnectionClick(connection.id)}
                      >
                        <td>
                          <FontAwesomeIcon
                            icon={faStar}
                            className={clsx(
                              styles.favoriteIcon,
                              connection.is_favorite && styles.favoriteIcon_active
                            )}
                          />
                        </td>
                        <td>
                          <div className={clsx(styles.connectionName)}>
                            <FontAwesomeIcon icon={faDatabase} />
                            <span>{connection.name || 'Без имени'}</span>
                          </div>
                          {connection.description && (
                            <div className={clsx(styles.connectionDescription)}>
                              {connection.description}
                            </div>
                          )}
                        </td>
                        <td>{connection.database_name || '—'}</td>
                        <td>{getDatabaseTypeBadge(connection.database_type)}</td>
                        <td>
                          <div className={clsx(styles.hostInfo)}>
                            <span>{connection.host}</span>
                            <span className={clsx(styles.port)}>{connection.port}</span>
                          </div>
                        </td>
                        <td>{getEnvironmentBadge(connection.environment)}</td>
                        <td>{getStatusBadge(connection.status)}</td>
                        <td>{formatSize(connection.db_size_mb)}</td>
                        <td>{connection.owner_username}</td>
                        <td>
                          <button
                            className={clsx(styles.actionButton)}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConnectionClick(connection.id);
                            }}
                          >
                            Открыть
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                        <FontAwesomeIcon icon={faChevronLeft} />
                      </button>
                      <span className={clsx(styles.pageInfo)}>
                        Страница {currentPage} из {totalPages}
                      </span>
                      <button
                        className={clsx(styles.paginationButton)}
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        <FontAwesomeIcon icon={faChevronRight} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className={clsx(styles.emptyState)}>
              <FontAwesomeIcon icon={faDatabase} size="3x" className={clsx(styles.emptyIcon)} />
              <h3>Подключения не найдены</h3>
              {searchQuery ? (
                <p>По вашему запросу "{searchQuery}" ничего не найдено</p>
              ) : (
                <p>У вас пока нет подключений к базам данных</p>
              )}
              <button className={clsx(styles.emptyButton)}>
                <FontAwesomeIcon icon={faPlus} />
                Создать первое подключение
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}