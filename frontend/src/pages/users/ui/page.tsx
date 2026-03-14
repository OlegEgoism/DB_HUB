import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import clsx from 'clsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronLeft,
  faChevronRight,
  faChevronCircleLeft,
  faChevronCircleRight,
  faSpinner,
  faExclamationCircle,
  faPlus,
  faPen,
  faTrash,
  faXmark,
  faSearch,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router';
import { ROUTES } from '@shared/config';
import { apiRequest } from '@shared/api/http';
import { useSession } from '@features/auth';
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

interface UserCreatePayload {
  username: string;
  email: string;
  fio: string;
  role: string;
  password: string;
}

interface UserUpdatePayload {
  email: string;
  fio: string;
  role: string;
  is_active: boolean;
  is_superuser: boolean;
}

type BoolFilter = 'all' | 'true' | 'false';
const PAGE_SIZES = [5, 10, 20, 50] as const;
const USER_ROLES = ['Администратор БД', 'Аналитик', 'Разработчик', 'Тестировщик', 'Пользователь'] as const;

const CREATE_FORM_INITIAL: UserCreatePayload = {
  username: '',
  email: '',
  fio: '',
  role: 'Пользователь',
  password: '',
};

const UPDATE_FORM_INITIAL: UserUpdatePayload = {
  email: '',
  fio: '',
  role: 'Пользователь',
  is_active: false,
  is_superuser: false,
};

export default function UsersPage() {
  const navigate = useNavigate();
  const { checkAuth, getUser } = useSession();

  const isAuthenticated = checkAuth();
  const currentUser = getUser();
  const isSuperUser = Boolean(currentUser?.is_superuser);

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<BoolFilter>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState<UserCreatePayload>(CREATE_FORM_INITIAL);

  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [updateForm, setUpdateForm] = useState<UserUpdatePayload>(UPDATE_FORM_INITIAL);

  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);




  useEffect(() => {
    if (!isAuthenticated) {
      navigate(ROUTES.LOGIN);
      return;
    }

    if (!isSuperUser) {
      navigate(ROUTES.HOME);
    }
  }, [isAuthenticated, isSuperUser, navigate]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    const query = new URLSearchParams({
      page: String(currentPage),
      size: String(pageSize),
    });

    if (searchTerm.trim()) {
      query.set('search', searchTerm.trim());
    }
    if (activeFilter !== 'all') {
      query.set('is_active', activeFilter);
    }
    if (roleFilter !== 'all') {
      query.set('role', roleFilter);
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 10000);

    try {
      const data = await apiRequest<PaginatedUsersResponse>(`/api/v1/app_users?${query.toString()}`, {
        signal: controller.signal,
        withAuth: true,
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

      setError(err instanceof Error ? err.message : 'Не удалось загрузить пользователей');
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, activeFilter, roleFilter, navigate]);

  useEffect(() => {
    if (isSuperUser) {
      loadUsers();
    }
  }, [isSuperUser, loadUsers]);

  const handleSearchSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSearchTerm(searchQuery.trim());
    setCurrentPage(1);
  };

  const handleSearchClear = () => {
    setSearchQuery('');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handlePageChange = (nextPage: number) => {
    if (nextPage >= 1 && nextPage <= totalPages) {
      setCurrentPage(nextPage);
    }
  };

  const handlePageSizeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(event.target.value));
    setCurrentPage(1);
  };

  const handleFirstPage = () => {
    setCurrentPage(1);
  };

  const handleLastPage = () => {
    setCurrentPage(totalPages);
  };

  const resetActionError = () => setActionError(null);

  const openCreateModal = () => {
    resetActionError();
    setCreateForm(CREATE_FORM_INITIAL);
    setIsCreateModalOpen(true);
  };

  const openEditModal = (user: User) => {
    resetActionError();
    setEditingUserId(user.id);
    setUpdateForm({
      email: user.email,
      fio: user.fio ?? '',
      role: user.role,
      is_active: user.is_active,
      is_superuser: user.is_superuser,
    });
  };

  const closeModals = () => {
    if (isSubmitting) {
      return;
    }
    setIsCreateModalOpen(false);
    setEditingUserId(null);
    setDeletingUser(null);
    resetActionError();
  };

  const handleCreateSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    resetActionError();

    try {
      await apiRequest<User>('/api/v1/app_users', {
        method: 'POST',
        withAuth: true,
        body: JSON.stringify({
          ...createForm,
          username: createForm.username.trim(),
          email: createForm.email.trim(),
          fio: createForm.fio.trim(),
        }),
      });

      setIsCreateModalOpen(false);
      if (currentPage !== 1) {
        setCurrentPage(1);
      } else {
        await loadUsers();
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Не удалось создать пользователя');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingUserId) {
      return;
    }

    setIsSubmitting(true);
    resetActionError();

    try {
      await apiRequest<User>(`/api/v1/app_users/${editingUserId}`, {
        method: 'PUT',
        withAuth: true,
        body: JSON.stringify({
          ...updateForm,
          email: updateForm.email.trim(),
          fio: updateForm.fio.trim(),
        }),
      });

      setEditingUserId(null);
      await loadUsers();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Не удалось обновить пользователя');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) {
      return;
    }

    setIsSubmitting(true);
    resetActionError();

    try {
      await apiRequest<void>(`/api/v1/app_users/${deletingUser.id}`, {
        method: 'DELETE',
        withAuth: true,
      });

      setDeletingUser(null);

      if (users.length === 1 && currentPage > 1) {
        setCurrentPage((prev) => prev - 1);
      } else {
        await loadUsers();
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Не удалось удалить пользователя');
    } finally {
      setIsSubmitting(false);
    }
  };

  const editingUser = useMemo(() => users.find((user) => user.id === editingUserId) ?? null, [users, editingUserId]);


  const shownFrom = users.length > 0 ? ((currentPage - 1) * pageSize) + 1 : 0;
  const shownTo = users.length > 0 ? shownFrom + users.length - 1 : 0;


  if (!isAuthenticated || !isSuperUser) {
    return null;
  }

  return (
    <section className={clsx(styles.users)}>
      <div className="container">
        <div className={clsx(styles.users__section)}>
      <div className={clsx(styles.users__header)}>
        <div className={clsx(styles.users__titleContainer)}>
          <h1 className={clsx(styles.users__title)}>
            Пользователи
            <span className={clsx(styles.users__countBadge)}>{users.length}</span>
          </h1>
        </div>
        <div className={clsx(styles.users__actions)}>
          <form className={clsx(styles.users__toolbar)} onSubmit={handleSearchSubmit}>
            <div className={clsx(styles.users__searchWrapper)}>
              <FontAwesomeIcon icon={faSearch} className={clsx(styles.users__searchIcon)} />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Поиск"
                className={clsx(styles.users__searchInput)}
              />
              {searchQuery && (
                <button type="button" className={clsx(styles.users__searchClear)} onClick={handleSearchClear} title="Очистить поиск">
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              )}
            </div>

            <select
              value={activeFilter}
              className={clsx(styles.users__filterSelect)}
              onChange={(event) => {
                setActiveFilter(event.target.value as BoolFilter);
                setCurrentPage(1);
              }}
            >
              <option value="all">Активности</option>
              <option value="true">Активные</option>
              <option value="false">Неактивные</option>
            </select>

            <select
              value={roleFilter}
              className={clsx(styles.users__filterSelect)}
              onChange={(event) => {
                setRoleFilter(event.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">Роли</option>
              {USER_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>


            <button type="submit" className={clsx(styles.users__searchButton)}>
              Поиск
            </button>
          </form>

          <button type="button" className={clsx(styles.users__createButton)} onClick={openCreateModal}>
            <FontAwesomeIcon icon={faPlus} />
            Добавить пользователя
          </button>
        </div>
      </div>

      {loading ? (
        <div className={clsx(styles.users__state)}>
          <FontAwesomeIcon icon={faSpinner} spin />
          <span>Загрузка пользователей...</span>
        </div>
      ) : error ? (
        <div className={clsx(styles.users__state, styles.users__state_error)}>
          <FontAwesomeIcon icon={faExclamationCircle} />
          <span>{error}</span>
        </div>
      ) : (
        <>
          <div className={clsx(styles.users__tableWrapper)}>
            <table className={clsx(styles.users__table)}>
              <thead>
                <tr>
                  <th>Логин</th>
                  <th>ФИО</th>
                  <th>Email</th>
                  <th>Роль</th>
                  <th>Активен</th>
                  <th>Суперпользователь</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.username}</td>
                    <td>{user.fio?.trim() || '—'}</td>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                    <td>{user.is_active ? 'Да' : 'Нет'}</td>
                    <td>{user.is_superuser ? 'Да' : 'Нет'}</td>
                    <td>
                      <div className={clsx(styles.users__rowActions)}>
                        <button type="button" className={clsx(styles.users__iconButton)} title="Редактировать" onClick={() => openEditModal(user)}>
                          <FontAwesomeIcon icon={faPen} />
                        </button>
                        <button
                          type="button"
                          className={clsx(styles.users__iconButton, styles.users__iconButton_delete)}
                          title="Удалить"
                          onClick={() => {
                            resetActionError();
                            setDeletingUser(user);
                          }}
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {users.length === 0 && (
            <div className={clsx(styles.users__state)}>
              <span>Пользователи не найдены.</span>
            </div>
          )}

          {totalItems > 0 && (
            <div className={clsx(styles.users__pagination)}>
              <div className={clsx(styles.users__paginationInfo)}>
                <span className={clsx(styles.users__paginationText)}>
                  Показано <span className={clsx(styles.users__paginationHighlight)}>{shownFrom}</span>–
                  <span className={clsx(styles.users__paginationHighlight)}>{shownTo}</span> из{' '}
                  <span className={clsx(styles.users__paginationHighlight)}>{totalItems}</span> пользователей
                </span>
              </div>

              <div className={clsx(styles.users__paginationControls)}>
                <select value={pageSize} onChange={handlePageSizeChange} className={clsx(styles.users__paginationSelect)}>
                  {PAGE_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size} на странице
                    </option>
                  ))}
                </select>

                <div className={clsx(styles.users__paginationButtons)}>
                  <button className={clsx(styles.users__paginationButton, styles.users__paginationButton_first)} onClick={handleFirstPage} disabled={currentPage === 1 || !hasPrev} title="Первая страница">
                    <FontAwesomeIcon icon={faChevronCircleLeft} />
                  </button>
                  <button className={clsx(styles.users__paginationButton)} onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1 || !hasPrev} title="Предыдущая страница">
                    <FontAwesomeIcon icon={faChevronLeft} />
                  </button>
                  <span className={clsx(styles.users__pageInfo)}>Страница {currentPage} из {totalPages}</span>
                  <button className={clsx(styles.users__paginationButton)} onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages || !hasNext} title="Следующая страница">
                    <FontAwesomeIcon icon={faChevronRight} />
                  </button>
                  <button className={clsx(styles.users__paginationButton, styles.users__paginationButton_last)} onClick={handleLastPage} disabled={currentPage === totalPages || !hasNext} title="Последняя страница">
                    <FontAwesomeIcon icon={faChevronCircleRight} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {isCreateModalOpen && (
        <div className={clsx(styles.modal__overlay)}>
          <div className={clsx(styles.modal__content)}>
            <button type="button" className={clsx(styles.modal__close)} onClick={closeModals} disabled={isSubmitting}>
              <FontAwesomeIcon icon={faXmark} />
            </button>
            <h2 className={clsx(styles.modal__title)}>Создать пользователя</h2>
            <form className={clsx(styles.modal__form)} onSubmit={handleCreateSubmit}>
              <label className={clsx(styles.modal__label)}>
                Логин
                <input required minLength={3} maxLength={50} value={createForm.username} onChange={(event) => setCreateForm((prev) => ({ ...prev, username: event.target.value }))} className={clsx(styles.modal__input)} />
              </label>
              <label className={clsx(styles.modal__label)}>
                Email
                <input required type="email" value={createForm.email} onChange={(event) => setCreateForm((prev) => ({ ...prev, email: event.target.value }))} className={clsx(styles.modal__input)} />
              </label>
              <label className={clsx(styles.modal__label)}>
                ФИО
                <input maxLength={100} value={createForm.fio} onChange={(event) => setCreateForm((prev) => ({ ...prev, fio: event.target.value }))} className={clsx(styles.modal__input)} />
              </label>
              <label className={clsx(styles.modal__label)}>
                Роль
                <select value={createForm.role} onChange={(event) => setCreateForm((prev) => ({ ...prev, role: event.target.value }))} className={clsx(styles.modal__input)}>
                  {USER_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>
              <label className={clsx(styles.modal__label)}>
                Пароль
                <input required type="password" minLength={4} value={createForm.password} onChange={(event) => setCreateForm((prev) => ({ ...prev, password: event.target.value }))} className={clsx(styles.modal__input)} />
              </label>

              {actionError && <div className={clsx(styles.modal__error)}>{actionError}</div>}

              <div className={clsx(styles.modal__actions)}>
                <button type="button" onClick={closeModals} className={clsx(styles.modal__button, styles.modal__button_cancel)} disabled={isSubmitting}>
                  Отмена
                </button>
                <button type="submit" className={clsx(styles.modal__button, styles.modal__button_submit)} disabled={isSubmitting}>
                  {isSubmitting ? 'Сохранение...' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingUser && (
        <div className={clsx(styles.modal__overlay)}>
          <div className={clsx(styles.modal__content)}>
            <button type="button" className={clsx(styles.modal__close)} onClick={closeModals} disabled={isSubmitting}>
              <FontAwesomeIcon icon={faXmark} />
            </button>
            <h2 className={clsx(styles.modal__title)}>Редактировать пользователя: {editingUser.username}</h2>
            <form className={clsx(styles.modal__form)} onSubmit={handleUpdateSubmit}>
              <label className={clsx(styles.modal__label)}>
                Email
                <input required type="email" value={updateForm.email} onChange={(event) => setUpdateForm((prev) => ({ ...prev, email: event.target.value }))} className={clsx(styles.modal__input)} />
              </label>
              <label className={clsx(styles.modal__label)}>
                ФИО
                <input maxLength={100} value={updateForm.fio} onChange={(event) => setUpdateForm((prev) => ({ ...prev, fio: event.target.value }))} className={clsx(styles.modal__input)} />
              </label>
              <label className={clsx(styles.modal__label)}>
                Роль
                <select value={updateForm.role} onChange={(event) => setUpdateForm((prev) => ({ ...prev, role: event.target.value }))} className={clsx(styles.modal__input)}>
                  {USER_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>

              <label className={clsx(styles.modal__checkbox)}>
                <input type="checkbox" checked={updateForm.is_active} onChange={(event) => setUpdateForm((prev) => ({ ...prev, is_active: event.target.checked }))} />
                Активен
              </label>
              <label className={clsx(styles.modal__checkbox)}>
                <input type="checkbox" checked={updateForm.is_superuser} onChange={(event) => setUpdateForm((prev) => ({ ...prev, is_superuser: event.target.checked }))} />
                Суперпользователь
              </label>

              {actionError && <div className={clsx(styles.modal__error)}>{actionError}</div>}

              <div className={clsx(styles.modal__actions)}>
                <button type="button" onClick={closeModals} className={clsx(styles.modal__button, styles.modal__button_cancel)} disabled={isSubmitting}>
                  Отмена
                </button>
                <button type="submit" className={clsx(styles.modal__button, styles.modal__button_submit)} disabled={isSubmitting}>
                  {isSubmitting ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

        {deletingUser && (
        <div className={clsx(styles.modal__overlay)}>
          <div className={clsx(styles.modal__content, styles.modal__content_small)}>
            <button type="button" className={clsx(styles.modal__close)} onClick={closeModals} disabled={isSubmitting}>
              <FontAwesomeIcon icon={faXmark} />
            </button>
            <h2 className={clsx(styles.modal__title)}>Удалить пользователя</h2>
            <p className={clsx(styles.modal__text)}>Вы уверены, что хотите удалить пользователя «{deletingUser.username}»?</p>
            {actionError && <div className={clsx(styles.modal__error)}>{actionError}</div>}
            <div className={clsx(styles.modal__actions)}>
              <button type="button" onClick={closeModals} className={clsx(styles.modal__button, styles.modal__button_cancel)} disabled={isSubmitting}>
                Отмена
              </button>
              <button type="button" onClick={handleDelete} className={clsx(styles.modal__button, styles.modal__button_delete)} disabled={isSubmitting}>
                {isSubmitting ? 'Удаление...' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </section>
  );
}
