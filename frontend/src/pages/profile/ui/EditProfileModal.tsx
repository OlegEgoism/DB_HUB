// frontend/src/pages/profile/ui/EditProfileModal.tsx
import {useState} from 'react';
import {useEditProfile} from '../lib/useEditProfile';
import type {User} from '@shared/types/user';
import clsx from 'clsx';
import styles from './edit-profile-modal.module.scss';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
    faTimes,
    faSpinner,
    faCheckCircle,
} from '@fortawesome/free-solid-svg-icons';
import { useI18n } from '@shared/i18n';

export function EditProfileModal({
                                     user,
                                     onClose,
                                     onSuccess,
                                 }: {
    user: User;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [formData, setFormData] = useState({
        email: user.email,
        fio: user.fio || '',
        role: user.role,
    });

    const [initialData] = useState({ ...formData });
    const {updateProfile, loading, error, success} = useEditProfile(user.id);
    const { t } = useI18n();



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Проверка на изменения
        if (
            formData.email === initialData.email &&
            formData.fio === initialData.fio &&
            formData.role === initialData.role
        ) {
            alert(t('profile.no_changes'));
            return;
        }

        try {
            await updateProfile(formData);
            onSuccess();
        } catch {
            // Ошибка уже обработана в хуке
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const isFormChanged = () => {
        return (
            formData.email !== initialData.email ||
            formData.fio !== initialData.fio ||
            formData.role !== initialData.role
        );
    };

    const handleClose = () => {
        if (!loading) {
            onClose();
        }
    };

    return (
        <div className={clsx(styles.modal__overlay)}>
            <div className={clsx(styles.modal__content)}>
                <button
                    className={clsx(styles.modal__closeButton)}
                    onClick={handleClose}
                    disabled={loading}
                    aria-label={t('profile.edit_title')}
                >
                    <FontAwesomeIcon icon={faTimes}/>
                </button>

                <div className={clsx(styles.modal__header)}>
                    <h2 className={clsx(styles.modal__title)}>
                        {success ? t('profile.updated_success') : t('profile.edit_title')}
                    </h2>
                </div>

                {success ? (
                    <div className={clsx(styles.modal__success)}>
                        <div className={clsx(styles.modal__successMessage)}>
                            <FontAwesomeIcon
                                icon={faCheckCircle}
                                style={{
                                    marginRight: '8px',
                                    color: 'var(--color-status-success)'
                                }}
                            />
                            {t('profile.updated_success')}
                        </div>
                        <div className={clsx(styles.modal__successHint)}>
                            {t('profile.saved_hint')}
                        </div>
                        <button
                            className={clsx(styles.modal__successButton)}
                            onClick={onClose}
                        >
                            OK
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className={clsx(styles.modal__form)}>
                        {error && (
                            <div className={clsx(styles.modal__error)}>
                                {error}
                            </div>
                        )}

                        <div className={clsx(styles.modal__formGroup)}>
                            <label htmlFor="email" className={clsx(styles.modal__label)}>
                                Email *
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                className={clsx(styles.modal__input)}
                                placeholder="user@example.com"
                                disabled={loading}
                                autoComplete="email"
                            />
                        </div>

                        <div className={clsx(styles.modal__formGroup)}>
                            <label htmlFor="fio" className={clsx(styles.modal__label)}>
                                {t('profile.fio')}
                            </label>
                            <input
                                type="text"
                                id="fio"
                                name="fio"
                                value={formData.fio}
                                onChange={handleChange}
                                className={clsx(styles.modal__input)}
                                placeholder={t('register.placeholder.fio')}
                                disabled={loading}
                            />
                        </div>

                        <div className={clsx(styles.modal__formGroup)}>
                            <label htmlFor="role" className={clsx(styles.modal__label)}>
                                {t('profile.role')}
                            </label>
                            <select
                                id="role"
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                className={clsx(styles.modal__select)}
                                disabled={loading}
                            >
                                <option value="Пользователь">{t('roles.user')}</option>
                                <option value="Аналитик">{t('roles.analyst')}</option>
                                <option value="Разработчик">{t('roles.developer')}</option>
                                <option value="Тестировщик">{t('roles.tester')}</option>
                                <option value="Администратор БД">{t('roles.admin')}</option>
                            </select>
                        </div>

                        <div className={clsx(styles.modal__formFooter)}>
                            <button
                                type="button"
                                className={clsx(styles.modal__cancelButton)}
                                onClick={handleClose}
                                disabled={loading}
                            >
                                {t('login.cancel')}
                            </button>
                            <button
                                type="submit"
                                className={clsx(styles.modal__submitButton)}
                                disabled={!isFormChanged() || loading}
                            >
                                {loading ? (
                                    <>
                                        <FontAwesomeIcon icon={faSpinner} spin/>
                                        {t('profile.saving')}
                                    </>
                                ) : (
                                    t('profile.save')
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
