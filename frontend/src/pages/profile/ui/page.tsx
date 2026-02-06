// frontend/src/pages/profile/ui/page.tsx
import clsx from 'clsx';
import { useProfile } from '../lib/useProfile';
import { useState } from 'react';
import styles from './styles.module.scss';
import { ChangePasswordModal } from './ChangePasswordModal';
import { EditProfileModal } from './EditProfileModal';

export default function ProfilePage() {
  const { user, loading, error } = useProfile();
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);

  // Форматирование даты
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Не указано';
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

  // Статус пользователя
  const getStatusBadge = (isActive: boolean) => {
    return (
      <span className={clsx(
        styles.profile__statusBadge,
        isActive ? styles.profile__statusBadge_active : styles.profile__statusBadge_inactive
      )}>
        {isActive ? 'Активен' : 'Неактивен'}
      </span>
    );
  };

  // Роль пользователя
  const getRoleBadge = (role: string) => {
    const roleColors: Record<string, string> = {
      'Администратор БД': 'admin',
      'Аналитик': 'analyst',
      'Разработчик': 'developer',
      'Тестировщик': 'tester',
      'Пользователь': 'user',
    };
    const roleClass = roleColors[role] || 'user';
    return (
      <span className={clsx(styles.profile__roleBadge, styles[`profile__roleBadge_${roleClass}`])}>
        {role}
      </span>
    );
  };

  // Обработчик клика по кнопке "Редактировать"
  const handleEditClick = () => {
    setIsEditProfileModalOpen(true);
  };

  // Обработчик клика по кнопке "Сменить пароль"
  const handleChangePasswordClick = () => {
    setIsChangePasswordModalOpen(true);
  };

  // Закрытие модального окна смены пароля
  const handleCloseChangePasswordModal = () => {
    setIsChangePasswordModalOpen(false);
  };

  // Закрытие модального окна редактирования
  const handleCloseEditProfileModal = () => {
    setIsEditProfileModalOpen(false);
  };

  // Обработчик успешного редактирования
  const handleEditSuccess = () => {
    setIsEditProfileModalOpen(false);
    // Перезагружаем данные профиля
    window.location.reload();
  };

  return (
    <section className={clsx(styles.profile)}>
      <div className="container">
        <div className={clsx(styles.profile__section)}>
          {!loading && !error && user && (
            <h1 className={clsx(styles.profile__title)}>Профиль {user.username}</h1>
          )}
          {loading && (
            <div className={clsx(styles.profile__loading)}>
              <div className={clsx(styles.profile__spinner)}></div>
              <p>Загрузка профиля...</p>
            </div>
          )}
          {error && (
            <div className={clsx(styles.profile__error)}>
              <p>Ошибка загрузки: {error}</p>
              <button
                className={clsx(styles.profile__retryButton)}
                onClick={() => window.location.reload()}
              >
                Попробовать снова
              </button>
            </div>
          )}
          {!loading && !error && user && (
            <div className={clsx(styles.profile__content)}>
              {/* Основная информация */}
              <div className={clsx(styles.profile__card)}>
                <div className={clsx(styles.profile__cardHeader)}>
                  <h2 className={clsx(styles.profile__cardTitle)}>Основная информация</h2>
                </div>
                <div className={clsx(styles.profile__cardBody)}>
                  <div className={clsx(styles.profile__infoGrid)}>
                    <div className={clsx(styles.profile__infoItem)}>
                      <div className={clsx(styles.profile__infoLabel)}>Email</div>
                      <div className={clsx(styles.profile__infoValue)}>{user.email}</div>
                    </div>
                    <div className={clsx(styles.profile__infoItem)}>
                      <div className={clsx(styles.profile__infoLabel)}>ФИО</div>
                      <div className={clsx(styles.profile__infoValue)}>{user.fio || 'Не указано'}</div>
                    </div>
                    <div className={clsx(styles.profile__infoItem)}>
                      <div className={clsx(styles.profile__infoLabel)}>Роль</div>
                      <div className={clsx(styles.profile__infoValue)}>
                        {getRoleBadge(user.role)}
                      </div>
                    </div>
                    <div className={clsx(styles.profile__infoItem)}>
                      <div className={clsx(styles.profile__infoLabel)}>Статус</div>
                      <div className={clsx(styles.profile__infoValue)}>
                        {getStatusBadge(user.is_active)}
                      </div>
                    </div>
                    <div className={clsx(styles.profile__infoItem)}>
                      <div className={clsx(styles.profile__infoLabel)}>Суперпользователь</div>
                      <div className={clsx(styles.profile__infoValue)}>
                        <span className={clsx(
                          styles.profile__badge,
                          user.is_superuser ? styles.profile__badge_success : styles.profile__badge_secondary
                        )}>
                          {user.is_superuser ? 'Да' : 'Нет'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

              {/* Даты */}
                <div className={clsx(styles.profile__cardHeader)}>
                  <h2 className={clsx(styles.profile__cardTitle)}>Дополнительная информация</h2>
                </div>
                <div className={clsx(styles.profile__cardBody)}>
                  <div className={clsx(styles.profile__infoGrid)}>
                    <div className={clsx(styles.profile__infoItem)}>
                      <div className={clsx(styles.profile__infoLabel)}>Дата регистрации</div>
                      <div className={clsx(styles.profile__infoValue)}>{formatDate(user.created_at)}</div>
                    </div>
                    <div className={clsx(styles.profile__infoItem)}>
                      <div className={clsx(styles.profile__infoLabel)}>Последнее обновление</div>
                      <div className={clsx(styles.profile__infoValue)}>{formatDate(user.updated_at)}</div>
                    </div>
                    <div className={clsx(styles.profile__infoItem)}>
                      <div className={clsx(styles.profile__infoLabel)}>Последний вход</div>
                      <div className={clsx(styles.profile__infoValue)}>
                        {user.last_login ? formatDate(user.last_login) : 'Еще не входил'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Действия */}
              <div className={clsx(styles.profile__actions)}>
                <button
                  className={clsx(styles.profile__actionButton, styles.profile__actionButton_primary)}
                  onClick={handleChangePasswordClick}
                >
                  Сменить пароль
                </button>
                <button
                  className={clsx(styles.profile__actionButton, styles.profile__actionButton_primary)}
                  onClick={handleEditClick}
                >
                  Редактировать
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Модальное окно смены пароля */}
      {isChangePasswordModalOpen && user && (
        <ChangePasswordModal
          userId={user.id}
          onClose={handleCloseChangePasswordModal}
        />
      )}

      {/* Модальное окно редактирования профиля */}
      {isEditProfileModalOpen && user && (
        <EditProfileModal
          user={user}
          onClose={handleCloseEditProfileModal}
          onSuccess={handleEditSuccess}
        />
      )}
    </section>
  );
}