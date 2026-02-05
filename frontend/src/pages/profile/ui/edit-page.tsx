// frontend/src/pages/profile/ui/edit-page.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useProfile } from '../lib/useProfile';
import { useEditProfile } from '../lib/useEditProfile';
import clsx from 'clsx';
import styles from './edit-styles.module.scss';
import { faSave, faTimes, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {ROUTES} from "@shared/config";

export default function EditProfilePage() {
  const navigate = useNavigate();
  const { user, loading: profileLoading, error: profileError } = useProfile();
  const [formData, setFormData] = useState({
    email: '',
    fio: '',
    role: 'Пользователь' as string,
  });
  const [initialData, setInitialData] = useState<typeof formData | null>(null);

  // Инициализация формы данными пользователя
  useEffect(() => {
    if (user) {
      const data = {
        email: user.email,
        fio: user.fio || '',
        role: user.role,
      };
      setFormData(data);
      setInitialData(data);
    }
  }, [user]);

  const userId = user?.id || 0;
  const { updateProfile, loading: updateLoading, error: updateError, success } = useEditProfile(userId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    // Проверка на изменения
    if (
      formData.email === initialData?.email &&
      formData.fio === initialData?.fio &&
      formData.role === initialData?.role
    ) {
      alert('Нет изменений для сохранения');
      return;
    }

    try {
      await updateProfile(formData);
      alert('Профиль успешно обновлен!');
      navigate(ROUTES.PROFILE);
    } catch (err) {
      // Ошибка уже обработана в хуке
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const isFormChanged = () => {
    if (!initialData) return false;
    return (
      formData.email !== initialData.email ||
      formData.fio !== initialData.fio ||
      formData.role !== initialData.role
    );
  };

  if (profileLoading) {
    return (
      <section className={clsx(styles.editProfile)}>
        <div className="container">
          <div className={clsx(styles.editProfile__loading)}>
            <div className={clsx(styles.editProfile__spinner)}></div>
            <p>Загрузка данных профиля...</p>
          </div>
        </div>
      </section>
    );
  }

  if (profileError || !user) {
    return (
      <section className={clsx(styles.editProfile)}>
        <div className="container">
          <div className={clsx(styles.editProfile__error)}>
            <p>{profileError || 'Ошибка загрузки данных профиля'}</p>
            <button
              className={clsx(styles.editProfile__retryButton)}
              onClick={() => window.location.reload()}
            >
              Попробовать снова
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={clsx(styles.editProfile)}>
      <div className="container">
        <div className={clsx(styles.editProfile__section)}>
          <div className={clsx(styles.editProfile__header)}>
            <h1 className={clsx(styles.editProfile__title)}>Редактирование профиля</h1>
            <button
              className={clsx(styles.editProfile__cancelButton)}
              onClick={handleCancel}
              disabled={updateLoading}
            >
              <FontAwesomeIcon icon={faTimes} />
              Отмена
            </button>
          </div>

          <form onSubmit={handleSubmit} className={clsx(styles.editProfile__form)}>
            {updateError && (
              <div className={clsx(styles.editProfile__errorAlert)}>
                <FontAwesomeIcon icon={faTimes} />
                <span>{updateError}</span>
              </div>
            )}

            {success && (
              <div className={clsx(styles.editProfile__successAlert)}>
                <FontAwesomeIcon icon={faCheck} />
                <span>Профиль успешно обновлен!</span>
              </div>
            )}

            <div className={clsx(styles.editProfile__card)}>
              <div className={clsx(styles.editProfile__cardHeader)}>
                <h2 className={clsx(styles.editProfile__cardTitle)}>Основная информация</h2>
              </div>
              <div className={clsx(styles.editProfile__cardBody)}>
                <div className={clsx(styles.editProfile__formGrid)}>
                  {/* Email */}
                  <div className={clsx(styles.editProfile__formGroup)}>
                    <label htmlFor="email" className={clsx(styles.editProfile__label)}>
                      Email *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className={clsx(styles.editProfile__input)}
                      placeholder="user@example.com"
                      disabled={updateLoading}
                    />
                    <div className={clsx(styles.editProfile__hint)}>
                      Используется для входа в систему
                    </div>
                  </div>

                  {/* ФИО */}
                  <div className={clsx(styles.editProfile__formGroup)}>
                    <label htmlFor="fio" className={clsx(styles.editProfile__label)}>
                      ФИО
                    </label>
                    <input
                      type="text"
                      id="fio"
                      name="fio"
                      value={formData.fio}
                      onChange={handleChange}
                      className={clsx(styles.editProfile__input)}
                      placeholder="Иванов Иван Иванович"
                      disabled={updateLoading}
                    />
                  </div>

                  {/* Роль */}
                  <div className={clsx(styles.editProfile__formGroup)}>
                    <label htmlFor="role" className={clsx(styles.editProfile__label)}>
                      Роль
                    </label>
                    <select
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      className={clsx(styles.editProfile__select)}
                      disabled={updateLoading}
                    >
                      <option value="Пользователь">Пользователь</option>
                      <option value="Аналитик">Аналитик</option>
                      <option value="Разработчик">Разработчик</option>
                      <option value="Тестировщик">Тестировщик</option>
                      <option value="Администратор БД">Администратор БД</option>
                    </select>
                    <div className={clsx(styles.editProfile__hint)}>
                      Роль определяет доступные функции в системе
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={clsx(styles.editProfile__actions)}>
              <button
                type="button"
                className={clsx(styles.editProfile__actionButton, styles.editProfile__actionButton_secondary)}
                onClick={handleCancel}
                disabled={updateLoading}
              >
                <FontAwesomeIcon icon={faTimes} />
                Отменить
              </button>
              <button
                type="submit"
                className={clsx(
                  styles.editProfile__actionButton,
                  styles.editProfile__actionButton_primary,
                  !isFormChanged() && styles.editProfile__actionButton_disabled
                )}
                disabled={!isFormChanged() || updateLoading}
              >
                {updateLoading ? (
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
        </div>
      </div>
    </section>
  );
}