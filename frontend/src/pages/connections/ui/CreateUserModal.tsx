// frontend/src/pages/connections/ui/CreateUserModal.tsx
import {useState} from 'react';
import {useCreateUser} from '../lib/useCreateUser';
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

export function CreateUserModal({
                                    connectionId,
                                    onClose,
                                    onSuccess,
                                }: {
    connectionId: number;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const { t } = useI18n();
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        email: '',
        description: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const {createUser, loading, error, success} = useCreateUser(connectionId);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

// Валидация обязательных полей
        if (!formData.username.trim()) {
            alert(t('users.create.alert.username_required'));
            return;
        }
        if (!formData.password.trim()) {
            alert(t('users.create.alert.password_required'));
            return;
        }
        if (formData.password.length < 4) {
            alert(t('password.min'));
            return;
        }
// ✅ ПРОВЕРКА: Email должен быть заполнен
        if (!formData.email.trim()) {
            alert(t('users.create.alert.email_required'));
            return;
        }
// Дополнительная проверка формата Email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email.trim())) {
            alert(t('users.create.alert.email_invalid'));
            return;
        }

        try {
            const createData = {
                username: formData.username.trim(),
                password: formData.password,
                email: formData.email.trim(),
                description: formData.description.trim() || '',
            };
            await createUser(createData);
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
                    aria-label={t('users.create.close')}
                >
                    <FontAwesomeIcon icon={faTimes}/>
                </button>
                <div className={clsx(styles.modal__header)}>
                    <h2 className={clsx(styles.modal__title)}>
                        {success ? t('users.create.success_title') : t('users.create.title')}
                    </h2>
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
                            {t('users.create.success_title')}
                        </div>
                        <div className={clsx(styles.modal__successHint)}>
                            {t('users.create.success_hint')}
                        </div>
                        <button className={clsx(styles.modal__successButton)} onClick={onClose}>
                            OK
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className={clsx(styles.modal__form)}>
                        {error && <div className={clsx(styles.modal__error)}>{getErrorMessage()}</div>}
                        <div className={clsx(styles.modal__formGroup)}>
                            <label htmlFor="username" className={clsx(styles.modal__label)}>
                                {t('login.username')} *
                            </label>
                            <input
                                type="text"
                                id="username"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                required
                                className={clsx(styles.modal__input)}
                                placeholder={t('login.username.placeholder')}
                                disabled={loading}
                                maxLength={50}
                            />
                        </div>
                        <div className={clsx(styles.modal__formGroup)}>
                            <label htmlFor="email" className={clsx(styles.modal__label)}>
                                {t('register.email')} *
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
                            />
                        </div>
                        <div className={clsx(styles.modal__formGroup)}>
                            <label htmlFor="password" className={clsx(styles.modal__label)}>
                                {t('login.password')} *
                            </label>
                            <div className={clsx(styles.modal__passwordWrapper)}>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
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
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <FontAwesomeIcon icon={faSpinner} spin/>
                                        {t('users.create.loading')}
                                    </>
                                ) : (
                                    t('users.create_user')
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
