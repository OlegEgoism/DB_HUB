// frontend/src/pages/profile/ui/ChangePasswordModal.tsx
import { useState } from 'react';
import { useChangePassword } from '../lib/useChangePassword';
import clsx from 'clsx';
import styles from './change-password-modal.module.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faSpinner,
  faEye,
  faEyeSlash,
  faCheckCircle,
} from '@fortawesome/free-solid-svg-icons';

export function ChangePasswordModal({
  userId,
  onClose,
}: {
  userId: number;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { changePassword, loading, error, success } = useChangePassword(userId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      alert('Пароли не совпадают');
      return;
    }
    if (formData.newPassword.length < 4) {
      alert('Пароль должен быть не менее 4 символов');
      return;
    }
    try {
      await changePassword({ new_password: formData.newPassword });
    } catch {
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
    if (error.includes('400') || error.includes('Invalid') || error.includes('Неверный')) {
      return 'Неверные данные. Проверьте введенные значения.';
    }
    if (error.includes('403')) {
      return 'Доступ запрещен. Проверьте ваши права доступа.';
    }
    if (error.includes('404')) {
      return 'Сервер недоступен.';
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
          aria-label="Закрыть окно смены пароля"
        >
          <FontAwesomeIcon icon={faTimes} />
        </button>
        <div className={clsx(styles.modal__header)}>
          <h2 className={clsx(styles.modal__title)}>
            {success ? 'Пароль успешно изменен!' : 'Смена пароля'}
          </h2>
        </div>
        {success ? (
          <div className={clsx(styles.modal__success)}>
            <div className={clsx(styles.modal__successMessage)}>
              <FontAwesomeIcon
                icon={faCheckCircle}
                style={{ marginRight: '8px', color: 'var(--color-status-success)' }}
              />
              Пароль успешно изменен!
            </div>
            <div className={clsx(styles.modal__userInfo)}>
              <div>
                <div className={clsx(styles.modal__userInfoLabel)}>
                  Теперь вы можете войти с новым паролем
                </div>
              </div>
            </div>
            <button className={clsx(styles.modal__successButton)} onClick={onClose}>
              OK
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
              <label htmlFor="newPassword" className={clsx(styles.modal__label)}>
                Новый пароль *
              </label>
              <div className={clsx(styles.modal__passwordWrapper)}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="newPassword"
                  name="newPassword"
                  value={formData.newPassword}
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
                    Изменение...
                  </>
                ) : (
                  'Изменить пароль'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}