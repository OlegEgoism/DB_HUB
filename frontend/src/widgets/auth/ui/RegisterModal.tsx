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
} from '@fortawesome/free-solid-svg-icons';
import { useI18n } from '@shared/i18n';

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
  const { t } = useI18n();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert(t('register.alert.password_mismatch'));
      return;
    }
    if (formData.password.length < 4) {
      alert(t('register.alert.password_min'));
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
    } catch {
      // Ошибка уже обработана в хуке
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
      return t('register.error.exists');
    }
    if (error.includes('403')) {
      return t('register.error.forbidden');
    }
    if (error.includes('404')) {
      return t('register.error.not_found');
    }
    if (error.includes('500') || error.includes('Internal Server Error')) {
      return t('register.error.server');
    }
    if (error.includes('Network Error') || error.includes('Failed to fetch')) {
      return t('register.error.network');
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
          aria-label={t('register.close')}
        >
          <FontAwesomeIcon icon={faTimes} />
        </button>
        <div className={clsx(styles.modal__header)}>
          <h2 className={clsx(styles.modal__title)}>
            {success ? t('register.success') : t('register.title')}
          </h2>
        </div>
        {success ? (
          <div className={clsx(styles.modal__success)}>
            <div className={clsx(styles.modal__successMessage)}>
              {t('register.wait_activation')}
            </div>
            <div className={clsx(styles.modal__userInfo)}>
              <div>
                <div className={clsx(styles.modal__userInfoLabel)}>{t('login.username')}: <strong>{formData.username}</strong></div>
              </div>
              <div>
                <div className={clsx(styles.modal__userInfoLabel)}>{t('register.email')}: <strong>{formData.email}</strong></div>
              </div>
              <div>
                <div className={clsx(styles.modal__userInfoLabel)}>{t('register.role')}: <strong>{formData.role}</strong></div>
              </div>
            </div>
            <button className={clsx(styles.modal__successButton)} onClick={onClose}>
              {t('register.close_button')}
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
                placeholder={t('register.placeholder.username')}
                disabled={loading}
                autoComplete="username"
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
                autoComplete="email"
              />
            </div>
            <div className={clsx(styles.modal__formGroup)}>
              <label htmlFor="fio" className={clsx(styles.modal__label)}>
                {t('register.fio')}
              </label>
              <input
                type="text"
                id="fio"
                name="fio"
                value={formData.fio}
                onChange={handleChange}
                // required
                className={clsx(styles.modal__input)}
                placeholder={t('register.placeholder.fio')}
                disabled={loading}
              />
            </div>
            <div className={clsx(styles.modal__formGroup)}>
              <label htmlFor="role" className={clsx(styles.modal__label)}>
                {t('register.role')}
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className={clsx(styles.modal__select)}
                disabled={loading}
              >
                <option value="Пользователь">{t('roles.user')}</option>
                <option value="Аналитик">{t('roles.analyst')}</option>
                <option value="Разработчик">{t('roles.developer')}</option>
                <option value="Тестировщик">{t('roles.tester')}</option>
              </select>
            </div>
            <div className={clsx(styles.modal__formGroup)}>
              <label htmlFor="password" className={clsx(styles.modal__label)}>
                {t('register.password')} *
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
                {t('register.password.confirm')} *
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
                  placeholder={t('register.placeholder.password.confirm')}
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
                {t('register.cancel')}
              </button>
              <button
                type="submit"
                className={clsx(styles.modal__submitButton)}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} spin />
                    {t('register.loading')}
                  </>
                ) : (
                  t('register.submit')
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
