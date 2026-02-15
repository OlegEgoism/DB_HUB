// frontend/src/pages/connections/ui/EditUserModal.tsx
import {useState, useEffect} from 'react';
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
    const [formData, setFormData] = useState({
        email: user.email || '',
        description: user.description || '',
        password: '',
    });

    const [showPassword, setShowPassword] = useState(false);
    const [initialData, setInitialData] = useState({...formData});

    const {updateUser, loading, error, success} = useUpdateUser(connectionId, user.oid);

    useEffect(() => {
        setFormData({
            email: user.email || '',
            description: user.description || '',
            password: '',
        });
        setInitialData({
            email: user.email || '',
            description: user.description || '',
            password: '',
        });
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Проверка на изменения
        const hasChanges = Object.keys(formData).some(
            (key) => formData[key as keyof typeof formData] !== initialData[key as keyof typeof initialData]
        );

        if (!hasChanges) {
            alert('Нет изменений для сохранения');
            return;
        }

        try {
            const updateData: any = {};

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
        } catch (err) {
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
            return 'Неверные данные. Проверьте введенные значения.';
        }
        if (error.includes('403')) {
            return 'Доступ запрещен. Проверьте ваши права доступа.';
        }
        if (error.includes('404')) {
            return 'Пользователь не найден.';
        }
        if (error.includes('500') || error.includes('Internal Server Error')) {
            return 'Внутренняя ошибка сервера. Попробуйте позже.';
        }
        if (error.includes('Network Error') || error.includes('Failed to fetch')) {
            return 'Ошибка сети. Проверьте подключение к интернету.';
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
                    aria-label="Закрыть окно редактирования"
                >
                    <FontAwesomeIcon icon={faTimes}/>
                </button>
                <div className={clsx(styles.modal__header)}>
                    <h2 className={clsx(styles.modal__title)}>
                        {success ? 'Пользователь обновлен!' : 'Редактирование пользователя'}
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
                            Пользователь успешно обновлен!
                        </div>
                        <div className={clsx(styles.modal__successHint)}>
                            Ваши изменения сохранены
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
                                Описание
                            </label>
                            <textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                className={clsx(styles.modal__textarea)}
                                placeholder="Описание пользователя"
                                disabled={loading}
                                rows={3}
                            />
                        </div>

                        <div className={clsx(styles.modal__formGroup)}>
                            <label htmlFor="password" className={clsx(styles.modal__label)}>
                                Новый пароль (оставьте пустым, чтобы не менять)
                            </label>
                            <div className={clsx(styles.modal__passwordWrapper)}>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
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
                                disabled={!isFormChanged() || loading}
                            >
                                {loading ? (
                                    <>
                                        <FontAwesomeIcon icon={faSpinner} spin/>
                                        Сохранение...
                                    </>
                                ) : (
                                    'Сохранить'
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}