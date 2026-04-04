import { useState } from 'react';
import { useLogin } from '@pages/auth/lib/useLogin';
import clsx from 'clsx';
import styles from './LoginModal.module.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faEye,
    faEyeSlash,
    faCheckCircle,
    faTimes,
} from '@fortawesome/free-solid-svg-icons';
import { useI18n } from '@shared/i18n';

export function LoginModal({
    onClose,
    onLoginSuccess,
    onOpenRegister,
}: {
    onClose: () => void;
    onLoginSuccess?: () => void;
    onOpenRegister?: () => void;
}) {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const { login, loading, error, success } = useLogin();
    const { t } = useI18n();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.username.trim() || !formData.password.trim()) {
            alert(t('login.alert.fill'));
            return;
        }
        await login(formData);
        if (onLoginSuccess) {
            onLoginSuccess();
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    const handleOpenRegister = () => {
        if (loading || !onOpenRegister) return;
        onOpenRegister();
    };

    // Функция для форматирования сообщения об ошибке
    const getErrorMessage = () => {
        if (!error) return null;

        // Обработка ошибки неактивного пользователя
        if (
            error.includes('not active') ||
            error.includes('не актив') ||
            error.includes('is_active') ||
            error.includes('аккаунт не актив') ||
            error.includes('account not active') ||
            error.includes('Account is not active') ||
            error.includes('User is not active')
        ) {
            return t('login.error.inactive');
        }

        // Обработка ошибки 429 (Too Many Requests)
        if (error.includes('429') || error.includes('HTTP error! status: 429')) {
            return t('login.error.too_many');
        }

        // Обработка других ошибок
        if (error.includes('401') || error.includes('Invalid credentials') || error.includes('Неверные учетные данные')) {
            return t('login.error.invalid');
        }

        if (error.includes('403')) {
            return t('login.error.forbidden');
        }

        if (error.includes('404')) {
            return t('login.error.not_found');
        }

        if (error.includes('500') || error.includes('Internal Server Error')) {
            return t('login.error.server');
        }

        if (error.includes('Network Error') || error.includes('Failed to fetch')) {
            return t('login.error.network');
        }

        // По умолчанию возвращаем оригинальное сообщение
        return error;
    };

    return (
        <div className={clsx(styles.modal__overlay)}>
            <div className={clsx(styles.modal__content)}>
                <button
                    className={clsx(styles.modal__closeButton)}
                    onClick={handleClose}
                    disabled={loading}
                    aria-label={t('login.close')}
                >
                    <FontAwesomeIcon icon={faTimes} />
                </button>

                <div className={clsx(styles.modal__header)}>
                    <h2 className={clsx(styles.modal__title)}>
                        {success ? t('login.welcome') : t('login.title')}
                    </h2>
                </div>

                {success ? (
                    <div className={clsx(styles.modal__success)}>
                        <div className={clsx(styles.modal__successMessage)}>
                            <FontAwesomeIcon icon={faCheckCircle} style={{ marginRight: '8px', color: 'var(--color-status-success)' }} />
                            {t('login.success')}
                        </div>
                        <div className={clsx(styles.modal__userInfo)}>
                            <div>
                                <div className={clsx(styles.modal__userInfoLabel)}>{t('login.username')}:</div>
                                <div className={clsx(styles.modal__userInfoValue)}>{formData.username}</div>
                            </div>
                        </div>
                        <button
                            className={clsx(styles.modal__successButton)}
                            onClick={onClose}
                        >
                            {t('login.start')}
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className={clsx(styles.modal__form)}>
                        {error && (
                            <div className={clsx(styles.modal__error)}>
                                {getErrorMessage()}
                            </div>
                        )}

                        <div className={clsx(styles.modal__formGroup)}>
                            <label htmlFor="username" className={clsx(styles.modal__label)}>
                                {t('login.username')}
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
                                autoComplete="username"
                            />
                        </div>

                        <div className={clsx(styles.modal__formGroup)}>
                            <label htmlFor="password" className={clsx(styles.modal__label)}>
                                {t('login.password')}
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
                                    placeholder={t('login.password.placeholder')}
                                    disabled={loading}
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    className={clsx(styles.modal__togglePassword)}
                                    onClick={togglePasswordVisibility}
                                    disabled={loading}
                                >
                                    <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
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
                                disabled={loading}
                            >
                                {loading ? t('login.loading') : t('login.submit')}
                            </button>
                        </div>
                        {onOpenRegister && (
                            <div className={clsx(styles.modal__switchAuth)}>
                                <span>{t('login.no_account')}</span>
                                <button
                                    type="button"
                                    className={clsx(styles.modal__switchAuthButton)}
                                    onClick={handleOpenRegister}
                                    disabled={loading}
                                >
                                    {t('header.register')}
                                </button>
                            </div>
                        )}
                    </form>
                )}
            </div>
        </div>
    );
}
