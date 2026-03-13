import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import clsx from 'clsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronLeft,
  faChevronRight,
  faPen,
  faPlus,
  faSearch,
  faTimes,
  faTrashAlt,
} from '@fortawesome/free-solid-svg-icons';
import { useSession } from '@features/auth';
import {
  createAppUser,
  deleteAppUser,
  fetchAppUsers,
  updateAppUser,
} from '@pages/app-users/lib/api';
import type {
  AppUser,
  AppUserCreatePayload,
  AppUserUpdatePayload,
} from '@pages/app-users/model/types';
import { USER_ROLES, USERS_PAGE_SIZES } from '@pages/app-users/model/types';
import styles from './styles.module.scss';

const ADMIN_ROLE = 'Администратор БД';

export default function AppUsersPage() {
  const navigate = useNavigate();
  const { getUser, checkAuth } = useSession();
  const isAuthenticated = checkAuth();
  const currentUser = getUser();
  const isAdmin = currentUser?.role === ADMIN_ROLE;

  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<AppUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<AppUser | null>(null);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchAppUsers({ page, size, search: searchTerm });
      setUsers(data.items);
      setTotalItems(data.total);
      setTotalPages(Math.max(1, data.pages));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить пользователей');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) return;
    loadUsers();
  }, [page, size, searchTerm, isAdmin, isAuthenticated]);

  const handleSubmitCreate = async (payload: AppUserCreatePayload) => {
    setSubmitting(true);
    try {
      await createAppUser(payload);
      setCreateOpen(false);
      setPage(1);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать пользователя');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitEdit = async (payload: AppUserUpdatePayload) => {
    if (!editUser) return;
    setSubmitting(true);
    try {
      await updateAppUser(editUser.id, payload);
      setEditUser(null);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось обновить пользователя');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteUser) return;
    setSubmitting(true);
    try {
      await deleteAppUser(deleteUser.id);
      setDeleteUser(null);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить пользователя');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  if (!isAdmin) {
    return (
      <main className={styles.page}>
        <section className="container">
          <div className={styles.card}>
            <h1>Доступ ограничен</h1>
            <p className={styles.error}>Раздел «Пользователи» доступен только роли «Администратор БД».</p>
            <button className={styles.primaryButton} onClick={() => navigate('/')}>
              На главную
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <main className={styles.page}>
      <section className="container">
        <div className={styles.card}>
          <div className={styles.header}>
            <h1>APP USERS</h1>
            <button className={styles.primaryButton} onClick={() => setCreateOpen(true)}>
              <FontAwesomeIcon icon={faPlus} /> Создать пользователя
            </button>
          </div>

          <form
            className={styles.searchForm}
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              setSearchTerm(searchQuery.trim());
            }}
          >
            <div className={styles.searchInputWrap}>
              <FontAwesomeIcon icon={faSearch} className={styles.searchIcon} />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по username/email/ФИО"
              />
              {searchQuery && (
                <button type="button" onClick={() => { setSearchQuery(''); setSearchTerm(''); setPage(1); }}>
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              )}
            </div>

            <select value={size} onChange={(e) => { setSize(Number(e.target.value)); setPage(1); }}>
              {USERS_PAGE_SIZES.map((pageSize) => (
                <option key={pageSize} value={pageSize}>{pageSize} / стр.</option>
              ))}
            </select>
          </form>

          {error && <p className={styles.error}>{error}</p>}

          {loading ? (
            <p>Загрузка...</p>
          ) : (
            <>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Username</th>
                    <th>ФИО</th>
                    <th>Email</th>
                    <th>Роль</th>
                    <th>Активен</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.id}</td>
                      <td>{user.username}</td>
                      <td>{user.fio || '—'}</td>
                      <td>{user.email}</td>
                      <td>{user.role}</td>
                      <td>{user.is_active ? 'Да' : 'Нет'}</td>
                      <td>
                        <div className={styles.rowActions}>
                          <button onClick={() => setEditUser(user)}>
                            <FontAwesomeIcon icon={faPen} />
                          </button>
                          <button onClick={() => setDeleteUser(user)}>
                            <FontAwesomeIcon icon={faTrashAlt} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className={styles.pagination}>
                <span>Всего: {totalItems}</span>
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <FontAwesomeIcon icon={faChevronLeft} />
                </button>
                <span>{page} / {totalPages}</span>
                <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  <FontAwesomeIcon icon={faChevronRight} />
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      {createOpen && (
        <UserFormModal
          title="Создание пользователя"
          submitLabel="Создать"
          onClose={() => setCreateOpen(false)}
          onSubmit={(payload) => handleSubmitCreate(payload as AppUserCreatePayload)}
          loading={submitting}
        />
      )}

      {editUser && (
        <UserFormModal
          title={`Редактирование: ${editUser.username}`}
          submitLabel="Сохранить"
          initialUser={editUser}
          onClose={() => setEditUser(null)}
          onSubmit={(payload) => handleSubmitEdit(payload as AppUserUpdatePayload)}
          loading={submitting}
        />
      )}

      {deleteUser && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <h3>Удалить пользователя?</h3>
            <p>{deleteUser.username}</p>
            <div className={styles.modalActions}>
              <button onClick={() => setDeleteUser(null)}>Отмена</button>
              <button className={styles.dangerButton} onClick={handleConfirmDelete} disabled={submitting}>Удалить</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

interface UserFormModalProps {
  title: string;
  submitLabel: string;
  loading: boolean;
  initialUser?: AppUser;
  onClose: () => void;
  onSubmit: (payload: AppUserCreatePayload | AppUserUpdatePayload) => Promise<void>;
}

function UserFormModal({ title, submitLabel, loading, initialUser, onClose, onSubmit }: UserFormModalProps) {
  const isEdit = Boolean(initialUser);
  const [username, setUsername] = useState(initialUser?.username || '');
  const [email, setEmail] = useState(initialUser?.email || '');
  const [fio, setFio] = useState(initialUser?.fio || '');
  const [role, setRole] = useState(initialUser?.role || USER_ROLES[4]);
  const [password, setPassword] = useState('');
  const [isActive, setIsActive] = useState(initialUser?.is_active ?? true);
  const [isSuperuser, setIsSuperuser] = useState(initialUser?.is_superuser ?? false);

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h3>{title}</h3>
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            if (isEdit) {
              onSubmit({
                email,
                fio,
                role,
                is_active: isActive,
                is_superuser: isSuperuser,
              });
            } else {
              onSubmit({
                username,
                email,
                fio,
                role,
                password,
              });
            }
          }}
        >
          {!isEdit && (
            <label>
              Username
              <input required value={username} onChange={(e) => setUsername(e.target.value)} minLength={3} />
            </label>
          )}
          <label>
            Email
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label>
            ФИО
            <input value={fio} onChange={(e) => setFio(e.target.value)} />
          </label>
          <label>
            Роль
            <select value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
              {USER_ROLES.map((roleItem) => (
                <option key={roleItem} value={roleItem}>{roleItem}</option>
              ))}
            </select>
          </label>

          {!isEdit && (
            <label>
              Пароль
              <input required minLength={4} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
          )}

          {isEdit && (
            <div className={styles.checkboxes}>
              <label>
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                Активен
              </label>
              <label>
                <input type="checkbox" checked={isSuperuser} onChange={(e) => setIsSuperuser(e.target.checked)} />
                Суперпользователь
              </label>
            </div>
          )}

          <div className={styles.modalActions}>
            <button type="button" onClick={onClose}>Отмена</button>
            <button className={clsx(styles.primaryButton)} type="submit" disabled={loading}>{submitLabel}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
