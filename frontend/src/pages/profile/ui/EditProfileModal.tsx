// frontend/src/pages/profile/ui/EditProfileModal.tsx
import { useState, useEffect } from 'react';
import { useEditProfile } from '../lib/useEditProfile';
import clsx from 'clsx';
import styles from './edit-profile-modal.module.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faSpinner,
  faCheckCircle,
  faSave,
  faUser,
  faEnvelope,
  faIdCard,
  faShieldAlt,
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
  const [initialData, setInitialData] = useState({ ...formData });

  const { updateProfile, loading, error, success } = useEditProfile(user.id);

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
    if (!loading && success) {
      onClose();
    } else if (!loading) {
      onClose();
    }
  };

  return (
    <div className={clsx(styles.modal__overlay)} onClick={handleClose}>
      <div
        className={clsx(styles.modal__content)}
        onClick={(e) => e.stopPropagation()}
      >
        {success ? (
          <div className={clsx(styles.modal__success)}>
            <div className={clsx(styles.modal__successIcon)}>
              <FontAwesomeIcon
                icon={faCheckCircle}
                size="3x"
                style={{ color: 'var(--color-status-success)' }}
              />
            </div>
            <div className={clsx(styles.modal__successMessage)}>
              Профиль успешно обновлен!
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
            <div className={clsx(styles.modal__header)}>
              <h2 className={clsx(styles.modal__title)}>Редактирование профиля</h2>
              <button
                type="button"
                className={clsx(styles.modal__closeButton)}
                onClick={handleClose}
                disabled={loading}
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            {error && (
              <div className={clsx(styles.modal__error)}>
                <FontAwesomeIcon icon={faTimes} />
                <span>{error}</span>
              </div>
            )}

            <div className={clsx(styles.modal__body)}>
              <div className={clsx(styles.modal__card)}>
                {/*<div className={clsx(styles.modal__cardHeader)}>*/}
                {/*  <h3 className={clsx(styles.modal__cardTitle)}>Основная информация</h3>*/}
                {/*</div>*/}
                <div className={clsx(styles.modal__cardBody)}>
                  <div className={clsx(styles.modal__formGrid)}>
                    {/* Email */}
                    <div className={clsx(styles.modal__formGroup)}>
                      <label htmlFor="email" className={clsx(styles.modal__label)}>
                        <FontAwesomeIcon icon={faEnvelope} />
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
                      {/*<div className={clsx(styles.modal__hint)}>*/}
                      {/*  Используется для входа в систему*/}
                      {/*</div>*/}
                    </div>

                    {/* ФИО */}
                    <div className={clsx(styles.modal__formGroup)}>
                      <label htmlFor="fio" className={clsx(styles.modal__label)}>
                        <FontAwesomeIcon icon={faIdCard} />
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

                    {/* Роль */}
                    <div className={clsx(styles.modal__formGroup)}>
                      <label htmlFor="role" className={clsx(styles.modal__label)}>
                        <FontAwesomeIcon icon={faShieldAlt} />
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
                      <div className={clsx(styles.modal__hint)}>
                        Роль определяет доступные функции в системе
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={clsx(styles.modal__footer)}>
              <button
                type="button"
                className={clsx(styles.modal__cancelButton)}
                onClick={handleClose}
                disabled={loading}
              >
                <FontAwesomeIcon icon={faTimes} />
                Отмена
              </button>
              <button
                type="submit"
                className={clsx(
                  styles.modal__submitButton,
                  !isFormChanged() && styles.modal__submitButton_disabled
                )}
                disabled={!isFormChanged() || loading}
              >
                {loading ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} spin />
                    Сохранение...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faSave} />
                    Сохранить изменения
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