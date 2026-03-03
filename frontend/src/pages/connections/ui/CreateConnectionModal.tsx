import { useState } from 'react';
import { useCreateConnection } from '../lib/useCreateConnection';
import { useLogin } from '@pages/auth/lib/useLogin';
import clsx from 'clsx';
import styles from './edit-connection-modal.module.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faSpinner, faCheckCircle, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

export function CreateConnectionModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    database_type: 'postgresql' as const,
    environment: 'development' as const,
    is_favorite: false,
    host: '',
    port: 5432,
    database_name: '',
    username: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const { createConnection, loading, error, success } = useCreateConnection();
  const { getUser } = useLogin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.host.trim() || !formData.database_name.trim() || !formData.username.trim()) {
      alert('Пожалуйста, заполните обязательные поля');
      return;
    }

    const currentUser = getUser();
    if (!currentUser) {
      alert('Ошибка: пользователь не авторизован. Пожалуйста, войдите в систему.');
      return;
    }

    const createData = {
      ...formData,
      description: formData.description || null,
      owner_id: currentUser.id,
    };

    await createConnection(createData);
    onSuccess();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.checked }));
  };

  const getErrorMessage = () => {
    if (!error) return null;
    if (error.includes('400') || error.includes('Invalid') || error.includes('Неверный')) return 'Неверные данные. Проверьте введенные значения.';
    if (error.includes('403')) return 'Доступ запрещен. Проверьте ваши права доступа.';
    if (error.includes('404')) return 'Подключение не найдено.';
    if (error.includes('500') || error.includes('Internal Server Error')) return 'Внутренняя ошибка сервера. Попробуйте позже.';
    if (error.includes('Network Error') || error.includes('Failed to fetch')) return 'Ошибка сети. Проверьте подключение к интернету.';
    return error;
  };

  return (
    <div className={clsx(styles.modal__overlay)}>
      <div className={clsx(styles.modal__content)}>
        <button className={clsx(styles.modal__closeButton)} onClick={onClose} disabled={loading} aria-label="Закрыть окно создания">
          <FontAwesomeIcon icon={faTimes} />
        </button>
        <div className={clsx(styles.modal__header)}>
          <h2 className={clsx(styles.modal__title)}>{success ? 'Подключение создано!' : 'Создание подключения'}</h2>
        </div>
        {success ? (
          <div className={clsx(styles.modal__success)}>
            <div className={clsx(styles.modal__successMessage)}>
              <FontAwesomeIcon icon={faCheckCircle} style={{ marginRight: '8px', color: 'var(--color-status-success)' }} />
              Подключение успешно создано!
            </div>
            <div className={clsx(styles.modal__successHint)}>Ваше новое подключение добавлено в список</div>
            <button className={clsx(styles.modal__successButton)} onClick={onClose}>OK</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={clsx(styles.modal__form)}>
            {error && <div className={clsx(styles.modal__error)}>{getErrorMessage()}</div>}
            <div className={clsx(styles.modal__formGroup)}><label htmlFor="name" className={clsx(styles.modal__label)}>Название подключения *</label><input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required className={clsx(styles.modal__input)} disabled={loading} maxLength={30} /></div>
            <div className={clsx(styles.modal__formGroup)}><label htmlFor="description" className={clsx(styles.modal__label)}>Описание</label><input type="text" id="description" name="description" value={formData.description} onChange={handleChange} className={clsx(styles.modal__input)} disabled={loading} maxLength={100} /></div>
            <div className={clsx(styles.modal__formGroup)}><div className={clsx(styles.modal__dualRow)}><div className={clsx(styles.modal__dualColumn)}><label htmlFor="database_type" className={clsx(styles.modal__label)}>Тип базы данных *</label><select id="database_type" name="database_type" value={formData.database_type} onChange={handleChange} className={clsx(styles.modal__select)} disabled={loading}><option value="postgresql">PostgreSQL</option><option value="greenplum">Greenplum</option></select></div><div className={clsx(styles.modal__dualColumn)}><label htmlFor="environment" className={clsx(styles.modal__label)}>Окружение *</label><select id="environment" name="environment" value={formData.environment} onChange={handleChange} className={clsx(styles.modal__select)} disabled={loading}><option value="development">Разработка</option><option value="testing">Тестирование</option><option value="production">Продакшн</option><option value="analytics">Аналитика</option></select></div></div></div>
            <div className={clsx(styles.modal__formGroup)}><label htmlFor="host" className={clsx(styles.modal__label)}>Хост *</label><input type="text" id="host" name="host" value={formData.host} onChange={handleChange} required className={clsx(styles.modal__input)} disabled={loading} /></div>
            <div className={clsx(styles.modal__formGroup)}><label htmlFor="port" className={clsx(styles.modal__label)}>Порт *</label><input type="number" id="port" name="port" value={formData.port} onChange={handleChange} required className={clsx(styles.modal__input)} disabled={loading} min={1} max={65535} /></div>
            <div className={clsx(styles.modal__formGroup)}><label htmlFor="database_name" className={clsx(styles.modal__label)}>Имя БД *</label><input type="text" id="database_name" name="database_name" value={formData.database_name} onChange={handleChange} required className={clsx(styles.modal__input)} disabled={loading} /></div>
            <div className={clsx(styles.modal__formGroup)}><label htmlFor="username" className={clsx(styles.modal__label)}>Пользователь *</label><input type="text" id="username" name="username" value={formData.username} onChange={handleChange} required className={clsx(styles.modal__input)} disabled={loading} /></div>
            <div className={clsx(styles.modal__formGroup)}><label htmlFor="password" className={clsx(styles.modal__label)}>Пароль</label><div className={clsx(styles.modal__passwordWrapper)}><input type={showPassword ? 'text' : 'password'} id="password" name="password" value={formData.password} onChange={handleChange} className={clsx(styles.modal__input, styles.modal__input_password)} disabled={loading} /><button type="button" className={clsx(styles.modal__passwordToggle)} onClick={() => setShowPassword((p) => !p)} disabled={loading}><FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} /></button></div></div>
            <div className={clsx(styles.modal__checkboxGroup)}><label className={clsx(styles.modal__checkboxLabel)}><input type="checkbox" name="is_favorite" checked={formData.is_favorite} onChange={handleCheckboxChange} disabled={loading} />Добавить в избранное</label></div>
            <div className={clsx(styles.modal__formFooter)}><button type="button" className={clsx(styles.modal__cancelButton)} onClick={onClose} disabled={loading}>Отмена</button><button type="submit" className={clsx(styles.modal__submitButton)} disabled={loading}>{loading ? <><FontAwesomeIcon icon={faSpinner} spin /> Создание...</> : 'Создать подключение'}</button></div>
          </form>
        )}
      </div>
    </div>
  );
}
