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

export function LoginModal({
    onClose,
    onLoginSuccess
}: {
    onClose: () => void;
    onLoginSuccess?: () => void;
}) {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const { login, loading, error, success } = useLogin();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.username.trim() || !formData.password.trim()) {
            alert('Пожалуйста, заполните все поля');
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
            return 'Ваш аккаунт не активирован в системе. Обратитесь к администратору.';
        }

        // Обработка ошибки 429 (Too Many Requests)
        if (error.includes('429') || error.includes('HTTP error! status: 429')) {
            return 'Вы сделали слишком много попыток входа. Попробуйте позже.';
        }

        // Обработка других ошибок
        if (error.includes('401') || error.includes('Invalid credentials') || error.includes('Неверные учетные данные')) {
            return 'Неверное имя пользователя или пароль.';
        }

        if (error.includes('403')) {
            return 'Доступ запрещен. Проверьте ваши права доступа.';
        }

        if (error.includes('404')) {
            return 'Сервер авторизации недоступен.';
        }

        if (error.includes('500') || error.includes('Internal Server Error')) {
            return 'Внутренняя ошибка сервера. Попробуйте позже.';
        }

        if (error.includes('Network Error') || error.includes('Failed to fetch')) {
            return 'Ошибка сети. Проверьте подключение к интернету.';
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
                    aria-label="Закрыть окно авторизации"
                >
                    <FontAwesomeIcon icon={faTimes} />
                </button>

                <div className={clsx(styles.modal__header)}>
                    <h2 className={clsx(styles.modal__title)}>
                        {success ? 'Добро пожаловать!' : 'Авторизация'}
                    </h2>
                </div>

                {success ? (
                    <div className={clsx(styles.modal__success)}>
                        <div className={clsx(styles.modal__successMessage)}>
                            <FontAwesomeIcon icon={faCheckCircle} style={{ marginRight: '8px', color: 'var(--color-status-success)' }} />
                            Авторизация успешна!
                        </div>
                        <div className={clsx(styles.modal__userInfo)}>
                            <div>
                                <div className={clsx(styles.modal__userInfoLabel)}>Имя пользователя:</div>
                                <div className={clsx(styles.modal__userInfoValue)}>{formData.username}</div>
                            </div>
                        </div>
                        <button
                            className={clsx(styles.modal__successButton)}
                            onClick={onClose}
                        >
                            Начать работу
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
                                Имя пользователя
                            </label>
                            <input
                                type="text"
                                id="username"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                required
                                className={clsx(styles.modal__input)}
                                placeholder="Введите имя пользователя"
                                disabled={loading}
                                autoComplete="username"
                            />
                        </div>

                        <div className={clsx(styles.modal__formGroup)}>
                            <label htmlFor="password" className={clsx(styles.modal__label)}>
                                Пароль
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
                                    placeholder="Введите пароль"
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
                                Отмена
                            </button>
                            <button
                                type="submit"
                                className={clsx(styles.modal__submitButton)}
                                disabled={loading}
                            >
                                {loading ? 'Вход...' : 'Войти'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}