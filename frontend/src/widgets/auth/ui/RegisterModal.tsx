// frontend/src/widgets/auth/ui/RegisterModal.tsx
import { useState } from 'react';
import { useRegister } from '@pages/auth/lib/useRegister';
import clsx from 'clsx';
import styles from './RegisterModal.module.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faTimes,
    faSpinner,
    faEye,
    faEyeSlash,
    faCancel,
    faRightToBracket, faCheck
} from '@fortawesome/free-solid-svg-icons';

export function RegisterModal({ onClose }: { onClose: () => void }) {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        fio: '',
        role: 'Пользователь' as const,
        password: '',
        confirmPassword: '',
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const { register, loading, error, success } = useRegister();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            alert('Пароли не совпадают');
            return;
        }

        if (formData.password.length < 4) {
            alert('Пароль должен быть не менее 4 символов');
            return;
        }

        try {
            await register({
                username: formData.username,
                email: formData.email,
                fio: formData.fio,
                role: formData.role,
                password: formData.password,
            });
        } catch (err) {
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const toggleConfirmPasswordVisibility = () => {
        setShowConfirmPassword(!showConfirmPassword);
    };

    return (
        <div className={clsx(styles.modal__overlay)} onClick={onClose}>
            <div
                className={clsx(styles.modal__content)}
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className={clsx(styles.modal__title)}>
                    {success ? 'Регистрация успешна!' : 'Регистрация'}
                </h2>

                {success ? (
                    <div className={clsx(styles.modal__success)}>
                        <p>Дождитесь активации от администратора.</p>
                        <button
                            className={clsx(styles.modal__successButton)}
                            onClick={onClose}
                        >
                            Закрыть
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
                            />
                        </div>

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
                            />
                        </div>

                        <div className={clsx(styles.modal__formGroup)}>
                            <label htmlFor="fio" className={clsx(styles.modal__label)}>
                                ФИО *
                            </label>
                            <input
                                type="text"
                                id="fio"
                                name="fio"
                                value={formData.fio}
                                onChange={handleChange}
                                required
                                className={clsx(styles.modal__input)}
                                placeholder="Иванов Иван Иванович"
                                disabled={loading}
                            />
                        </div>

                        <div className={clsx(styles.modal__formGroup)}>
                            <label htmlFor="role" className={clsx(styles.modal__label)}>
                                Роль
                            </label>
                            <select
                                id="role"
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                className={clsx(styles.modal__select)}
                                disabled={loading}
                            >
                                <option value="Пользователь">Пользователь</option>
                                <option value="Аналитик">Аналитик</option>
                                <option value="Разработчик">Разработчик</option>
                                <option value="Тестировщик">Тестировщик</option>
                            </select>
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
                                    placeholder="Минимум 4 символа"
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
                            <label htmlFor="confirmPassword" className={clsx(styles.modal__label)}>
                                Подтвердите пароль *
                            </label>
                            <div className={clsx(styles.modal__passwordWrapper)}>
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    required
                                    className={clsx(styles.modal__input)}
                                    placeholder="Повторите пароль"
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    className={clsx(styles.modal__togglePassword)}
                                    onClick={toggleConfirmPasswordVisibility}
                                    disabled={loading}
                                >
                                    <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye}/>
                                </button>
                            </div>
                        </div>

                        <div className={clsx(styles.modal__formFooter)}>
                            <button
                                type="button"
                                className={clsx(styles.modal__cancelButton)}
                                onClick={onClose}
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
                                        Регистрация...
                                    </>
                                ) : (
                                    <>
                                        <FontAwesomeIcon icon={faCheck}/>
                                        Зарегистрироваться
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