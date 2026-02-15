// frontend/src/pages/connections/ui/CreateUserModal.tsx
import { useState } from 'react';
import { useCreateUser } from '../lib/useCreateUser';
import clsx from 'clsx';
import styles from './edit-user-modal.module.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faSpinner,
  faCheckCircle,
  faEye,
  faEyeSlash,
} from '@fortawesome/free-solid-svg-icons';

export function CreateUserModal({
  connectionId,
  onClose,
  onSuccess,
}: {
  connectionId: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    description: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const { createUser, loading, error, success } = useCreateUser(connectionId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Валидация
    if (!formData.username.trim()) {
      alert('Пожалуйста, введите имя пользователя');
      return;
    }
    if (!formData.password.trim()) {
      alert('Пожалуйста, введите пароль');
      return;
    }
    if (formData.password.length < 4) {
      alert('Пароль должен быть не менее 4 символов');
      return;
    }

    try {
      const createData = {
        username: formData.username.trim(),
        password: formData.password,
        email: formData.email.trim() || '',
        description: formData.description.trim() || '',
      };
      await createUser(createData);
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
          aria-label="Закрыть окно создания"
        >
          <FontAwesomeIcon icon={faTimes} />
        </button>
        <div className={clsx(styles.modal__header)}>
          <h2 className={clsx(styles.modal__title)}>
            {success ? 'Пользователь создан!' : 'Создание пользователя'}
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
              Пользователь успешно создан!
            </div>
            <div className={clsx(styles.modal__successHint)}>
              Новый пользователь добавлен в базу данных
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
                maxLength={50}
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
                  placeholder="Минимум 4 символа"
                  disabled={loading}
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
                {loading ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} spin />
                    Создание...
                  </>
                ) : (
                  'Создать пользователя'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}