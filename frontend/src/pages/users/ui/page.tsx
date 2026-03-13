import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import clsx from 'clsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronLeft,
  faChevronRight,
  faChevronCircleLeft,
  faChevronCircleRight,
  faSpinner,
  faExclamationCircle,
} from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router';
import { ROUTES } from '@shared/config';
import { apiRequest } from '@shared/api/http';
import type { User } from '@shared/types/user';
import styles from './styles.module.scss';

interface PaginatedUsersResponse {
  items: User[];
  total: number;
  page: number;
  size: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}

const PAGE_SIZES = [5, 10, 20, 50] as const;

export default function UsersPage() {
  const navigate = useNavigate();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 10000);

    try {
      const data = await apiRequest<PaginatedUsersResponse>(`/api/v1/app_users?page=${currentPage}&size=${pageSize}`, {
        signal: controller.signal,
      });

      setUsers(data.items);
      setTotalItems(data.total);
      setTotalPages(data.pages);
      setHasNext(data.has_next);
      setHasPrev(data.has_prev);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Сервер долго не отвечает. Проверьте, что backend запущен и доступен.');
        return;
      }

      if (err instanceof Error && err.message.includes('не авторизован')) {
        navigate(ROUTES.LOGIN);
        return;
      }

      console.error('Ошибка загрузки пользователей:', err);
      setError(err instanceof Error ? err.message : 'Не удалось загрузить пользователей');
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
    }
  }, [currentPage, pageSize, navigate]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handlePageChange = (nextPage: number) => {
    if (nextPage >= 1 && nextPage <= totalPages) {
      setCurrentPage(nextPage);
    }
  };

  const handlePageSizeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(event.target.value));
    setCurrentPage(1);
  };

  return (
    <section className={clsx(styles.usersPage)}>
      <div className="container">
        <h1 className={clsx(styles.title)}>Пользователи</h1>

        {loading ? (
          <div className={clsx(styles.state)}>
            <FontAwesomeIcon icon={faSpinner} spin />
            <span>Загрузка пользователей...</span>
          </div>
        ) : error ? (
          <div className={clsx(styles.state, styles.state_error)}>
            <FontAwesomeIcon icon={faExclamationCircle} />
            <span>{error}</span>
          </div>
        ) : (
          <>
            <div className={clsx(styles.tableWrapper)}>
              <table className={clsx(styles.table)}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Логин</th>
                    <th>ФИО</th>
                    <th>Email</th>
                    <th>Роль</th>
                    <th>Активен</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.id}</td>
                      <td>{user.username}</td>
                      <td>{user.fio?.trim() || '—'}</td>
                      <td>{user.email}</td>
                      <td>{user.role}</td>
                      <td>{user.is_active ? 'Да' : 'Нет'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {users.length === 0 && (
              <div className={clsx(styles.state)}>
                <span>Пользователи не найдены.</span>
              </div>
            )}

            {totalItems > 0 && (
              <div className={clsx(styles.pagination)}>
                <div className={clsx(styles.paginationInfo)}>
                  <span className={clsx(styles.paginationText)}>
                    Показано <span className={clsx(styles.paginationHighlight)}>{((currentPage - 1) * pageSize) + 1}</span>–
                    <span className={clsx(styles.paginationHighlight)}>{Math.min(currentPage * pageSize, totalItems)}</span> из{' '}
                    <span className={clsx(styles.paginationHighlight)}>{totalItems}</span> пользователей
                  </span>
                </div>

                <div className={clsx(styles.paginationControls)}>
                  <select value={pageSize} onChange={handlePageSizeChange} className={clsx(styles.paginationSelect)}>
                    {PAGE_SIZES.map((size) => (
                      <option key={size} value={size}>
                        {size} / стр.
                      </option>
                    ))}
                  </select>

                  <div className={clsx(styles.paginationButtons)}>
                    <button
                      className={clsx(styles.paginationButton, styles.paginationButton_first)}
                      onClick={() => handlePageChange(1)}
                      disabled={currentPage === 1 || !hasPrev}
                      title="Первая страница"
                    >
                      <FontAwesomeIcon icon={faChevronCircleLeft} />
                    </button>
                    <button
                      className={clsx(styles.paginationButton)}
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1 || !hasPrev}
                      title="Предыдущая страница"
                    >
                      <FontAwesomeIcon icon={faChevronLeft} />
                    </button>
                    <span className={clsx(styles.pageInfo)}>Страница {currentPage} из {totalPages}</span>
                    <button
                      className={clsx(styles.paginationButton)}
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages || !hasNext}
                      title="Следующая страница"
                    >
                      <FontAwesomeIcon icon={faChevronRight} />
                    </button>
                    <button
                      className={clsx(styles.paginationButton, styles.paginationButton_last)}
                      onClick={() => handlePageChange(totalPages)}
                      disabled={currentPage === totalPages || !hasNext}
                      title="Последняя страница"
                    >
                      <FontAwesomeIcon icon={faChevronCircleRight} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
