// frontend/src/widgets/auth/ui/LoginModal.tsx
import {useState} from 'react';
import {useLogin} from '@pages/auth/lib/useLogin';
import clsx from 'clsx';
import styles from './LoginModal.module.scss';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
  faSpinner,
  faEye,
  faEyeSlash,
  faCheckCircle,
  faUserPlus,
  faCancel,
  faRightToBracket
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
    const {login, loading, error, success} = useLogin();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.username.trim() || !formData.password.trim()) {
            alert('Пожалуйста, заполните все поля');
            return;
        }

        try {
            await login(formData);
            if (onLoginSuccess) {
                onLoginSuccess();
            }
        } catch (err) {
            // Ошибка уже обработана в хуке
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

    return (
        <div className={clsx(styles.modal__overlay)} onClick={handleClose}>
            <div
                className={clsx(styles.modal__content)}
                onClick={(e) => e.stopPropagation()}
            >
                <div className={clsx(styles.modal__header)}>
                    <h2 className={clsx(styles.modal__title)}>
                        {success ? 'Добро пожаловать!' : 'Авторизация'}
                    </h2>
                    {!success && (
                        <p className={clsx(styles.modal__subtitle)}>
                            Войдите в свою учетную запись
                        </p>
                    )}
                </div>

                {success ? (
                    <div className={clsx(styles.modal__success)}>
                        <div className={clsx(styles.modal__successMessage)}>
                            <FontAwesomeIcon icon={faCheckCircle} style={{marginRight: '8px', color: 'var(--color-status-success)'}}/>
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
                                {error}
                            </div>
                        )}

                        <div className={clsx(styles.modal__formGroup)}>
                            <label htmlFor="username" className={clsx(styles.modal__label)}>
                                Имя пользователя *
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
                                Пароль *
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
                                <FontAwesomeIcon icon={faCancel}/>
                                Отмена
                            </button>
                            <button
                                type="submit"
                                className={clsx(styles.modal__submitButton)}
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <FontAwesomeIcon icon={faSpinner} spin/>
                                        Вход...
                                    </>
                                ) : (
                                    <>
                                        <FontAwesomeIcon icon={faRightToBracket}/>
                                        Войти
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}