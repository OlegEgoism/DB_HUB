// frontend/src/pages/profile/ui/EditProfileModal.tsx
import {useState, useEffect} from 'react';
import {useEditProfile} from '../lib/useEditProfile';
import clsx from 'clsx';
import styles from './edit-profile-modal.module.scss';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
    faTimes,
    faSpinner,
    faCheckCircle,
} from '@fortawesome/free-solid-svg-icons';

export function EditProfileModal({
                                     user,
                                     onClose,
                                     onSuccess,
                                 }: {
    user: any;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [formData, setFormData] = useState({
        email: user.email,
        fio: user.fio || '',
        role: user.role,
    });

    const [initialData, setInitialData] = useState({...formData});
    const {updateProfile, loading, error, success} = useEditProfile(user.id);

    useEffect(() => {
        setFormData({
            email: user.email,
            fio: user.fio || '',
            role: user.role,
        });
        setInitialData({
            email: user.email,
            fio: user.fio || '',
            role: user.role,
        });
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Проверка на изменения
        if (
            formData.email === initialData.email &&
            formData.fio === initialData.fio &&
            formData.role === initialData.role
        ) {
            alert('Нет изменений для сохранения');
            return;
        }

        try {
            await updateProfile(formData);
            onSuccess();
        } catch (err) {
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
                    aria-label="Закрыть окно редактирования"
                >
                    <FontAwesomeIcon icon={faTimes}/>
                </button>

                <div className={clsx(styles.modal__header)}>
                    <h2 className={clsx(styles.modal__title)}>
                        {success ? 'Профиль обновлен!' : 'Редактирование профиля'}
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
                            Профиль успешно обновлен!
                        </div>
                        <div className={clsx(styles.modal__successHint)}>
                            Ваши изменения сохранены
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
                                ФИО
                            </label>
                            <input
                                type="text"
                                id="fio"
                                name="fio"
                                value={formData.fio}
                                onChange={handleChange}
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
                                <option value="Администратор БД">Администратор БД</option>
                            </select>
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
                                    <>
                                        Сохранить
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
