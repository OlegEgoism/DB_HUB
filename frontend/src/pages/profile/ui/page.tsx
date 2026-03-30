// frontend/src/pages/profile/ui/page.tsx
import clsx from 'clsx';
import {useProfile} from '../lib/useProfile';
import {useState} from 'react';
import styles from './styles.module.scss';
import {ChangePasswordModal} from './ChangePasswordModal';
import {EditProfileModal} from './EditProfileModal';
import { useI18n } from '@shared/i18n';

export default function ProfilePage() {
    const {user, loading, error} = useProfile();
    const { language, t } = useI18n();
    const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
    const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);

    // Форматирование даты
    const formatDate = (dateString: string | null) => {
        if (!dateString) return t('profile.not_set');
        try {
            const date = new Date(dateString);
            return date.toLocaleString(language === 'en' ? 'en-US' : 'ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
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
        {isActive ? t('profile.active') : t('profile.inactive')}
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
        const roleTranslationMap: Record<string, string> = {
            'Администратор БД': t('roles.admin'),
            'Аналитик': t('roles.analyst'),
            'Разработчик': t('roles.developer'),
            'Тестировщик': t('roles.tester'),
            'Пользователь': t('roles.user'),
        };
        return (
            <span className={clsx(styles.profile__roleBadge, styles[`profile__roleBadge_${roleClass}`])}>
        {roleTranslationMap[role] ?? role}
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
                        <p className={clsx(styles.profile__title)}>{t('profile.title')}</p>
                    )}
                    {loading && (
                        <div className={clsx(styles.profile__loading)}>
                            <div className={clsx(styles.profile__spinner)}></div>
                            <p>{t('profile.loading')}</p>
                        </div>
                    )}
                    {error && (
                        <div className={clsx(styles.profile__error)}>
                            <p>{t('profile.error')}: {error}</p>
                            <button
                                className={clsx(styles.profile__retryButton)}
                                onClick={() => window.location.reload()}
                            >
                                {t('profile.retry')}
                            </button>
                        </div>
                    )}
                    {!loading && !error && user && (
                        <div className={clsx(styles.profile__content)}>
                            {/* Основная информация */}
                            <div className={clsx(styles.profile__card)}>
                                <div className={clsx(styles.profile__cardHeader)}>
                                    <h2 className={clsx(styles.profile__cardTitle)}>{t('profile.main')}</h2>
                                </div>
                                <div className={clsx(styles.profile__cardBody)}>
                                    <div className={clsx(styles.profile__infoGrid)}>
                                        <div className={clsx(styles.profile__infoItem)}>
                                            <div className={clsx(styles.profile__infoLabel)}>{t('profile.login')}</div>
                                            <div className={clsx(styles.profile__infoValue)}>{user.username}</div>
                                        </div>
                                        <div className={clsx(styles.profile__infoItem)}>
                                            <div className={clsx(styles.profile__infoLabel)}>{t('profile.email')}</div>
                                            <div className={clsx(styles.profile__infoValue)}>{user.email}</div>
                                        </div>
                                        <div className={clsx(styles.profile__infoItem)}>
                                            <div className={clsx(styles.profile__infoLabel)}>{t('profile.fio')}</div>
                                            <div className={clsx(styles.profile__infoValue)}>{user.fio || t('profile.not_set')}</div>
                                        </div>
                                        <div className={clsx(styles.profile__infoItem)}>
                                            <div className={clsx(styles.profile__infoLabel)}>{t('profile.role')}</div>
                                            <div className={clsx(styles.profile__infoValue)}>
                                                {getRoleBadge(user.role)}
                                            </div>
                                        </div>
                                        <div className={clsx(styles.profile__infoItem)}>
                                            <div className={clsx(styles.profile__infoLabel)}>{t('profile.status')}</div>
                                            <div className={clsx(styles.profile__infoValue)}>
                                                {getStatusBadge(user.is_active)}
                                            </div>
                                        </div>
                                        <div className={clsx(styles.profile__infoItem)}>
                                            <div className={clsx(styles.profile__infoLabel)}>{t('profile.superuser')}</div>
                                            <div className={clsx(styles.profile__infoValue)}>
                                                <span className={clsx(
                                                    styles.profile__badge,
                                                    user.is_superuser ? styles.profile__badge_success : styles.profile__badge_secondary
                                                )}>
                                                  {user.is_superuser ? t('yes') : t('no')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Даты */}
                                <div className={clsx(styles.profile__cardHeader)}>
                                    <h2 className={clsx(styles.profile__cardTitle)}>{t('profile.additional')}</h2>
                                </div>
                                <div className={clsx(styles.profile__cardBody)}>
                                    <div className={clsx(styles.profile__infoGrid)}>
                                        <div className={clsx(styles.profile__infoItem)}>
                                            <div className={clsx(styles.profile__infoLabel)}>{t('profile.registered_at')}</div>
                                            <div className={clsx(styles.profile__infoValue)}>{formatDate(user.created_at)}</div>
                                        </div>
                                        <div className={clsx(styles.profile__infoItem)}>
                                            <div className={clsx(styles.profile__infoLabel)}>{t('profile.updated_at')}</div>
                                            <div className={clsx(styles.profile__infoValue)}>{formatDate(user.updated_at)}</div>
                                        </div>
                                        <div className={clsx(styles.profile__infoItem)}>
                                            <div className={clsx(styles.profile__infoLabel)}>{t('profile.last_login')}</div>
                                            <div className={clsx(styles.profile__infoValue)}>
                                                {user.last_login ? formatDate(user.last_login) : t('profile.never_logged')}
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
                                    {t('profile.change_password')}
                                </button>
                                <button
                                    className={clsx(styles.profile__actionButton, styles.profile__actionButton_primary)}
                                    onClick={handleEditClick}
                                >
                                    {t('profile.edit')}
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
