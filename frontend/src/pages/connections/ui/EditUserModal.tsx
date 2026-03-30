// frontend/src/pages/connections/ui/EditUserModal.tsx
import {useState} from 'react';
import {useUpdateUser} from '../lib/useUpdateUser';
import clsx from 'clsx';
import styles from './edit-user-modal.module.scss';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
    faTimes,
    faSpinner,
    faCheckCircle,
    faEye,
    faEyeSlash,
} from '@fortawesome/free-solid-svg-icons';
import { useI18n } from '@shared/i18n';

interface User {
    oid: number;
    name: string;
    description: string | null;
    email: string | null;
}

export function EditUserModal({
                                  connectionId,
                                  user,
                                  onClose,
                                  onSuccess,
                              }: {
    connectionId: number;
    user: User;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const { t } = useI18n();
    const [formData, setFormData] = useState({
        email: user.email || '',
        description: user.description || '',
        password: '',
    });

    const [showPassword, setShowPassword] = useState(false);
    const [initialData] = useState({ ...formData });

    const {updateUser, loading, error, success} = useUpdateUser(connectionId, user.oid);



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Проверка на изменения
        const hasChanges = Object.keys(formData).some(
            (key) => formData[key as keyof typeof formData] !== initialData[key as keyof typeof initialData]
        );

        if (!hasChanges) {
            alert(t('profile.no_changes'));
            return;
        }

        try {
            const updateData: Record<string, string | null> = {};

            if (formData.email !== initialData.email) {
                updateData.email = formData.email.trim() === '' ? null : formData.email;
            }

            if (formData.description !== initialData.description) {
                updateData.description = formData.description.trim() === '' ? null : formData.description;
            }

            if (formData.password) {
                updateData.password = formData.password;
            }

            await updateUser(updateData);
            onSuccess();
        } catch {
            // Ошибка уже обработана в хуке
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const isFormChanged = () => {
        return Object.keys(formData).some(
            (key) => formData[key as keyof typeof formData] !== initialData[key as keyof typeof initialData]
        );
    };

    const handleClose = () => {
        if (!loading) {
            onClose();
        }
    };

    const getErrorMessage = () => {
        if (!error) return null;
        if (error.includes('400') || error.includes('Invalid') || error.includes('Неверный')) {
            return t('password.error.invalid');
        }
        if (error.includes('403')) {
            return t('password.error.forbidden');
        }
        if (error.includes('404')) {
            return t('users.create.error.not_found');
        }
        if (error.includes('500') || error.includes('Internal Server Error')) {
            return t('password.error.server');
        }
        if (error.includes('Network Error') || error.includes('Failed to fetch')) {
            return t('password.error.network');
        }
        return error;
    };

    return (
        <div className={clsx(styles.modal__overlay)}>
            <div className={clsx(styles.modal__content)}>
                <button
                    className={clsx(styles.modal__closeButton)}
                    onClick={handleClose}
                    disabled={loading}
                    aria-label={t('users.edit.close')}
                >
                    <FontAwesomeIcon icon={faTimes}/>
                </button>
                <div className={clsx(styles.modal__header)}>
                    <h2 className={clsx(styles.modal__title)}>
                        {success ? t('users.edit.updated_title') : t('users.edit_user')}
                    </h2>
                    <p className={clsx(styles.modal__subtitle)}>
                        {user.name}
                    </p>
                </div>
                {success ? (
                    <div className={clsx(styles.modal__success)}>
                        <div className={clsx(styles.modal__successMessage)}>
                            <FontAwesomeIcon
                                icon={faCheckCircle}
                                style={{
                                    marginRight: '8px',
                                    color: 'var(--color-status-success)',
                                }}
                            />
                            {t('users.edit.updated_title')}
                        </div>
                        <div className={clsx(styles.modal__successHint)}>
                            {t('profile.saved_hint')}
                        </div>
                        <button className={clsx(styles.modal__successButton)} onClick={onClose}>
                            OK
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className={clsx(styles.modal__form)}>
                        {error && <div className={clsx(styles.modal__error)}>{getErrorMessage()}</div>}

                        <div className={clsx(styles.modal__formGroup)}>
                            <label htmlFor="email" className={clsx(styles.modal__label)}>
                                Email
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className={clsx(styles.modal__input)}
                                placeholder="user@example.com"
                                disabled={loading}
                            />
                        </div>

                        <div className={clsx(styles.modal__formGroup)}>
                            <label htmlFor="description" className={clsx(styles.modal__label)}>
                                {t('users.create.description')}
                            </label>
                            <textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                className={clsx(styles.modal__textarea)}
                                placeholder={t('users.create.description_placeholder')}
                                disabled={loading}
                                rows={3}
                            />
                        </div>

                        <div className={clsx(styles.modal__formGroup)}>
                            <label htmlFor="password" className={clsx(styles.modal__label)}>
                                {t('users.edit.new_password_optional')}
                            </label>
                            <div className={clsx(styles.modal__passwordWrapper)}>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className={clsx(styles.modal__input)}
                                    placeholder={t('register.placeholder.password')}
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    className={clsx(styles.modal__togglePassword)}
                                    onClick={togglePasswordVisibility}
                                    disabled={loading}
                                >
                                    <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye}/>
                                </button>
                            </div>
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
