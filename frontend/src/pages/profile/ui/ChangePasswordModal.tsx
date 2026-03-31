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
import { useI18n } from '@shared/i18n';

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
  const { t } = useI18n();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      alert(t('password.mismatch'));
      return;
    }
    if (formData.newPassword.length < 4) {
      alert(t('password.min'));
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
      return t('password.error.invalid');
    }
    if (error.includes('403')) {
      return t('password.error.forbidden');
    }
    if (error.includes('404')) {
      return t('password.error.not_found');
    }
    if (error.includes('500') || error.includes('Internal Server Error')) {
      return t('password.error.server');
    }
    if (error.includes('Network Error') || error.includes('Failed to fetch')) {
      return t('password.error.network');
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
          aria-label={t('password.change_title')}
        >
          <FontAwesomeIcon icon={faTimes} />
        </button>
        <div className={clsx(styles.modal__header)}>
          <h2 className={clsx(styles.modal__title)}>
            {success ? t('password.changed') : t('password.change_title')}
          </h2>
        </div>
        {success ? (
          <div className={clsx(styles.modal__success)}>
            <div className={clsx(styles.modal__successMessage)}>
              <FontAwesomeIcon
                icon={faCheckCircle}
                style={{ marginRight: '8px', color: 'var(--color-status-success)' }}
              />
              {t('password.changed')}
            </div>
            <div className={clsx(styles.modal__userInfo)}>
              <div>
                <div className={clsx(styles.modal__userInfoLabel)}>
                  {t('password.hint')}
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
                {t('password.new')} *
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
                {t('password.confirm')} *
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
                {t('login.cancel')}
              </button>
              <button
                type="submit"
                className={clsx(styles.modal__submitButton)}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} spin />
                    {t('password.changing')}
                  </>
                ) : (
                  t('password.change')
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
