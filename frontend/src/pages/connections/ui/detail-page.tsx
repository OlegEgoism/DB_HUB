// frontend/src/pages/connections/ui/detail-page.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import clsx from 'clsx';
import styles from './detail-page.module.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDatabase,
  faStar,
  faSpinner,
  faExclamationCircle,
  faArrowLeft,
  faPencilAlt,
  faTrashAlt,
  faUser,
  faCodeBranch,
  faPlug,
  faHdd,
  faKey,
  faCheckCircle,
  faTimesCircle,
  faChartBar,
  faInfoCircle,
  faCogs,
  faTable,
  faUserGroup,
  faNetworkWired,
  faDatabase as faDatabaseIcon,
} from '@fortawesome/free-solid-svg-icons';
import { EditConnectionModal } from './EditConnectionModal';

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
  updated_at: string;
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

type TabType = 'overview' | 'metrics' | 'extensions';

export default function ConnectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [connection, setConnection] = useState<Connection | null>(null);
  const [metrics, setMetrics] = useState<DatabaseMetrics | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [confirmDeleteName, setConfirmDeleteName] = useState<string>('');
  const [editingConnection, setEditingConnection] = useState<Connection | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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
      console.error('Ошибка загрузки метрик:', err);
      setError(err instanceof Error ? err.message : 'Не удалось загрузить метрики');
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

  const handleBack = () => {
    navigate('/connections');
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

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'connected') {
      return (
        <span className={clsx(styles.statusBadge, styles.statusBadge_success)}>
          <FontAwesomeIcon icon={faCheckCircle} />
          Подключено
        </span>
      );
    }
    if (statusLower === 'error') {
      return (
        <span className={clsx(styles.statusBadge, styles.statusBadge_error)}>
          <FontAwesomeIcon icon={faTimesCircle} />
          Ошибка подключения
        </span>
      );
    }
    return (
      <span className={clsx(styles.statusBadge, styles.statusBadge_unknown)}>
        Неизвестно
      </span>
    );
  };

  const formatSize = (sizeMb: number | null | undefined) => {
    if (sizeMb === null || sizeMb === undefined || sizeMb === 0) return '—';
    if (sizeMb < 1024) return `${sizeMb.toFixed(1)} MB`;
    return `${(sizeMb / 1024).toFixed(1)} ГБ`;
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
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
        body: JSON.stringify({ is_favorite: !isFavorite }),
      });

      if (!response.ok) {
        throw new Error('Не удалось обновить статус избранного');
      }

      loadConnection();
    } catch (err) {
      console.error('Ошибка при изменении статуса избранного:', err);
      setError('Не удалось обновить статус избранного');
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

  if (loading) {
    return (
      <section className={clsx(styles.connectionDetail)}>
        <div className="container">
          <div className={clsx(styles.connectionDetail__section)}>
            <div className={clsx(styles.connectionDetail__loading)}>
              <div className={clsx(styles.spinner)}>
                <FontAwesomeIcon icon={faSpinner} spin size="3x" />
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
              <FontAwesomeIcon icon={faExclamationCircle} size="3x" />
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

  // Функция для получения значения метрики по ключу
  const getMetricValue = (metricKey: string, defaultValue: string = '—') => {
    if (!metrics) return defaultValue;
    const metric = metrics.basic_metrics.find(m => m.metric === metricKey);
    return metric ? metric.value : defaultValue;
  };

  return (
    <section className={clsx(styles.connectionDetail)}>
      <div className="container">
        <div className={clsx(styles.connectionDetail__section)}>
          {/* Заголовок с кнопкой назад */}
          <div className={clsx(styles.connectionDetail__header)}>
            <button
              className={clsx(styles.backButton)}
              onClick={handleBack}
              aria-label="Назад к списку подключений"
            >
              <FontAwesomeIcon icon={faArrowLeft} />
              Назад к списку
            </button>
          </div>

          {/* Карточка подключения */}
          <div className={clsx(styles.connectionCard)}>
            <div className={clsx(styles.cardHeader)}>
              <div className={clsx(styles.cardIconContainer)}>
                <FontAwesomeIcon
                  icon={faDatabaseIcon}
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
                  {connection.description || 'Без описания'}
                </div>
              </div>
            </div>

            {/* Вкладки */}
            <div className={clsx(styles.tabsContainer)}>
              <button
                className={clsx(
                  styles.tabButton,
                  activeTab === 'overview' && styles.tabButton_active
                )}
                onClick={() => setActiveTab('overview')}
              >
                <FontAwesomeIcon icon={faInfoCircle} />
                Обзор
              </button>
              <button
                className={clsx(
                  styles.tabButton,
                  activeTab === 'metrics' && styles.tabButton_active
                )}
                onClick={() => setActiveTab('metrics')}
              >
                <FontAwesomeIcon icon={faChartBar} />
                Метрики
              </button>
              <button
                className={clsx(
                  styles.tabButton,
                  activeTab === 'extensions' && styles.tabButton_active
                )}
                onClick={() => setActiveTab('extensions')}
              >
                <FontAwesomeIcon icon={faCogs} />
                Расширения
              </button>
            </div>

            {/* Содержимое вкладок */}
            <div className={clsx(styles.tabContent)}>
              {/* Вкладка Обзор */}
              {activeTab === 'overview' && (
                <div className={clsx(styles.overviewContent)}>
                  {/* Статус подключения */}
                  <div className={clsx(styles.statusSection)}>
                    <h3 className={clsx(styles.sectionTitle)}>Статус подключения</h3>
                    <div className={clsx(styles.statusContainer)}>
                      {getStatusBadge(connection.status)}
                    </div>
                  </div>

                  {/* Основная информация */}
                  <div className={clsx(styles.infoSection)}>
                    <h3 className={clsx(styles.sectionTitle)}>Основная информация</h3>
                    <div className={clsx(styles.infoGrid)}>
                      <div className={clsx(styles.infoItem)}>
                        <div className={clsx(styles.infoLabel)}>
                          <FontAwesomeIcon icon={faDatabase} className={clsx(styles.infoIcon)} />
                          ИМЯ БАЗЫ ДАННЫХ
                        </div>
                        <div className={clsx(styles.infoValue)}>
                          {connection.database_name || '—'}
                        </div>
                      </div>
                      <div className={clsx(styles.infoItem)}>
                        <div className={clsx(styles.infoLabel)}>
                          <FontAwesomeIcon icon={faUser} className={clsx(styles.infoIcon)} />
                          ПОЛЬЗОВАТЕЛЬ
                        </div>
                        <div className={clsx(styles.infoValue)}>
                          {connection.username}
                        </div>
                      </div>
                      <div className={clsx(styles.infoItem)}>
                        <div className={clsx(styles.infoLabel)}>
                          <FontAwesomeIcon icon={faCodeBranch} className={clsx(styles.infoIcon)} />
                          ХОСТ
                        </div>
                        <div className={clsx(styles.infoValue)}>
                          {connection.host}
                        </div>
                      </div>
                      <div className={clsx(styles.infoItem)}>
                        <div className={clsx(styles.infoLabel)}>
                          <FontAwesomeIcon icon={faPlug} className={clsx(styles.infoIcon)} />
                          ПОРТ
                        </div>
                        <div className={clsx(styles.infoValue)}>
                          {connection.port}
                        </div>
                      </div>
                      <div className={clsx(styles.infoItem)}>
                        <div className={clsx(styles.infoLabel)}>
                          <FontAwesomeIcon icon={faHdd} className={clsx(styles.infoIcon)} />
                          РАЗМЕР БАЗЫ
                        </div>
                        <div className={clsx(styles.infoValue)}>
                          {formatSize(connection.db_size_mb)}
                        </div>
                      </div>
                      <div className={clsx(styles.infoItem)}>
                        <div className={clsx(styles.infoLabel)}>
                          <FontAwesomeIcon icon={faKey} className={clsx(styles.infoIcon)} />
                          ВЛАДЕЛЕЦ
                        </div>
                        <div className={clsx(styles.infoValue)}>
                          {connection.owner_username || '—'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Дополнительная информация */}
                  <div className={clsx(styles.infoSection)}>
                    <h3 className={clsx(styles.sectionTitle)}>Дополнительная информация</h3>
                    <div className={clsx(styles.infoGrid)}>
                      <div className={clsx(styles.infoItem)}>
                        <div className={clsx(styles.infoLabel)}>
                          ID ПОДКЛЮЧЕНИЯ
                        </div>
                        <div className={clsx(styles.infoValue)}>
                          #{connection.id}
                        </div>
                      </div>
                      <div className={clsx(styles.infoItem)}>
                        <div className={clsx(styles.infoLabel)}>
                          ДАТА СОЗДАНИЯ
                        </div>
                        <div className={clsx(styles.infoValue)}>
                          {formatDate(connection.created_at)}
                        </div>
                      </div>
                      <div className={clsx(styles.infoItem)}>
                        <div className={clsx(styles.infoLabel)}>
                          ПОСЛЕДНЕЕ ОБНОВЛЕНИЕ
                        </div>
                        <div className={clsx(styles.infoValue)}>
                          {formatDate(connection.updated_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Вкладка Метрики - обновленная версия */}
              {activeTab === 'metrics' && (
                <div className={clsx(styles.metricsContent)}>
                  {loadingMetrics ? (
                    <div className={clsx(styles.metricsLoading)}>
                      <div className={clsx(styles.spinner)}>
                        <FontAwesomeIcon icon={faSpinner} spin size="2x" />
                      </div>
                      <p>Загрузка метрик...</p>
                    </div>
                  ) : metrics && metrics.basic_metrics.length > 0 ? (
                    <div className={clsx(styles.metricsGrid)}>
                      {/* Общая информация */}
                      <div className={clsx(styles.metricsCard)}>
                        <div className={clsx(styles.metricsCardHeader)}>
                          <FontAwesomeIcon icon={faDatabaseIcon} className={clsx(styles.metricsCardIcon)} />
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
                            <div className={clsx(styles.metricsCardLabel)}>Кодировка по умолчанию:</div>
                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('client_encoding', '—')}</div>
                          </div>
                          <div className={clsx(styles.metricsCardRow)}>
                            <div className={clsx(styles.metricsCardLabel)}>Коллация:</div>
                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('database_collation', '—')}</div>
                          </div>
                          <div className={clsx(styles.metricsCardRow)}>
                            <div className={clsx(styles.metricsCardLabel)}>Время работы:</div>
                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('server_uptime', '—')}</div>
                          </div>
                        </div>
                      </div>

                      {/* Структура базы */}
                      <div className={clsx(styles.metricsCard)}>
                        <div className={clsx(styles.metricsCardHeader)}>
                          <FontAwesomeIcon icon={faTable} className={clsx(styles.metricsCardIcon)} />
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
                          <FontAwesomeIcon icon={faUserGroup} className={clsx(styles.metricsCardIcon)} />
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
                          <FontAwesomeIcon icon={faNetworkWired} className={clsx(styles.metricsCardIcon)} />
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
                  ) : (
                    <div className={clsx(styles.metricsEmpty)}>
                      <FontAwesomeIcon icon={faInfoCircle} size="3x" />
                      <p>Метрики недоступны</p>
                      {error && <p className={clsx(styles.errorMessage)}>{error}</p>}
                    </div>
                  )}
                </div>
              )}

              {/* Вкладка Расширения */}
              {activeTab === 'extensions' && (
                <div className={clsx(styles.extensionsContent)}>
                  {metrics && metrics.extensions.length > 0 ? (
                    <div className={clsx(styles.extensionsGrid)}>
                      {metrics.extensions.map((ext, index) => (
                        <div key={index} className={clsx(styles.extensionCard)}>
                          <div className={clsx(styles.extensionHeader)}>
                            <div className={clsx(styles.extensionIcon)}>
                              <FontAwesomeIcon icon={faCogs} />
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
                      <FontAwesomeIcon icon={faCogs} size="3x" />
                      <p>Расширения не найдены</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className={clsx(styles.cardFooter)}>
              <div className={clsx(styles.cardFooterLeft)}>
                <button
                  className={clsx(styles.actionButton, styles.actionButton_favorite)}
                  onClick={() => toggleFavorite(connection.id, connection.is_favorite)}
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
                  {connection.is_favorite ? 'В избранном' : 'В избранное'}
                </button>
              </div>
              <div className={clsx(styles.cardFooterRight)}>
                <button
                  className={clsx(styles.actionButton, styles.actionButton_edit)}
                  onClick={openEditModal}
                  title="Редактировать подключение"
                  disabled={deletingId === connection.id}
                >
                  <FontAwesomeIcon icon={faPencilAlt} className={clsx(styles.actionIcon)} />
                  Редактировать
                </button>
                <button
                  className={clsx(styles.actionButton, styles.actionButton_delete)}
                  onClick={() => openDeleteConfirm(connection.id, connection.name || 'Без имени')}
                  title="Удалить подключение"
                  disabled={deletingId !== null}
                >
                  <FontAwesomeIcon icon={faTrashAlt} className={clsx(styles.actionIcon)} />
                  Удалить
                </button>
              </div>
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
                <FontAwesomeIcon icon={faExclamationCircle} />
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
                    <FontAwesomeIcon icon={faSpinner} spin />
                    Удаление...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faTrashAlt} />
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
    </section>
  );
}