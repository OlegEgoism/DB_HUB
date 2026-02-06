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
  faCheckCircle,
} from '@fortawesome/free-solid-svg-icons';

// Тип для данных регистрации
interface RegisterData {
  username: string;
  email: string;
  fio: string;
  role: string;
  password: string;
}

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
      const userData: RegisterData = {
        username: formData.username,
        email: formData.email,
        fio: formData.fio,
        role: formData.role,
        password: formData.password,
      };
      await register(userData);
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

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  // Функция для форматирования сообщения об ошибке
  const getErrorMessage = () => {
    if (!error) return null;
    if (error.includes('400') || error.includes('already exists') || error.includes('уже существует')) {
      return 'Пользователь с таким именем или email уже существует.';
    }
    if (error.includes('403')) {
      return 'Доступ запрещен. Проверьте ваши права доступа.';
    }
    if (error.includes('404')) {
      return 'Сервер регистрации недоступен.';
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
          aria-label="Закрыть окно регистрации"
        >
          <FontAwesomeIcon icon={faTimes} />
        </button>
        <div className={clsx(styles.modal__header)}>
          <h2 className={clsx(styles.modal__title)}>
            {success ? 'Регистрация успешна!' : 'Регистрация'}
          </h2>
        </div>
        {success ? (
          <div className={clsx(styles.modal__success)}>
            <div className={clsx(styles.modal__successMessage)}>
              Дождитесь активации от администратора
            </div>
            <div className={clsx(styles.modal__userInfo)}>
              <div>
                <div className={clsx(styles.modal__userInfoLabel)}>Имя пользователя: <strong>{formData.username}</strong></div>
              </div>
              <div>
                <div className={clsx(styles.modal__userInfoLabel)}>Email: <strong>{formData.email}</strong></div>
              </div>
              <div>
                <div className={clsx(styles.modal__userInfoLabel)}>Роль: <strong>{formData.role}</strong></div>
              </div>
            </div>
            <button className={clsx(styles.modal__successButton)} onClick={onClose}>
              Закрыть
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
                  autoComplete="new-password"
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
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className={clsx(styles.modal__togglePassword)}
                  onClick={toggleConfirmPasswordVisibility}
                  disabled={loading}
                >
                  <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} />
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
                {loading ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} spin />
                    Регистрация...
                  </>
                ) : (
                  'Зарегистрироваться'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}