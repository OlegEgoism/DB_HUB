// frontend/src/pages/connections/ui/EditConnectionModal.tsx
import {useState} from 'react';
import {useEditConnection} from '../lib/useEditConnection';
import clsx from 'clsx';
import styles from './edit-connection-modal.module.scss';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
    faTimes,
    faSpinner,
    faCheckCircle,
    faEye,
    faEyeSlash,
} from '@fortawesome/free-solid-svg-icons';
import { useI18n } from '@shared/i18n';
import {apiRequest} from '@shared/api/http';

interface Connection {
    id: number;
    name: string;
    description: string | null;
    database_type: string;
    environment: string;
    is_favorite: boolean;
    host: string;
    port: number;
    database_name: string;
    username: string;
    password?: string;
    owner_id: number;
}

interface ConnectionTestResponse {
    success: boolean;
    message: string;
    resolved_host: string | null;
}

export function EditConnectionModal({
                                        connection,
                                        onClose,
                                        onSuccess,
                                    }: {
    connection: Connection;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [formData, setFormData] = useState({
        name: connection.name,
        description: connection.description || '',
        database_type: connection.database_type,
        environment: connection.environment,
        is_favorite: connection.is_favorite,
        host: connection.host,
        port: connection.port,
        database_name: connection.database_name,
        username: connection.username,
        password: '',
    });

    const [showPassword, setShowPassword] = useState(false);
    const [isTestingConnection, setIsTestingConnection] = useState(false);
    const [testConnectionNotice, setTestConnectionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [initialData] = useState({ ...formData });
    const {updateConnection, loading, error, success} = useEditConnection(connection.id);
    const { t } = useI18n();



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Проверка на изменения
        const hasChanges = Object.keys(formData).some(
            (key) => formData[key as keyof typeof formData] !== initialData[key as keyof typeof initialData]
        );
        if (!hasChanges && !formData.password) {
            alert(t('profile.no_changes'));
            return;
        }
        try {
            const updateData: Partial<Connection> = {};
            if (formData.name !== initialData.name) updateData.name = formData.name;
            if (formData.description !== initialData.description) {
                updateData.description = formData.description.trim() === '' ? null : formData.description;
            }
            if (formData.database_type !== initialData.database_type) updateData.database_type = formData.database_type;
            if (formData.environment !== initialData.environment) updateData.environment = formData.environment;
            if (formData.is_favorite !== initialData.is_favorite) updateData.is_favorite = formData.is_favorite;
            if (formData.host !== initialData.host) updateData.host = formData.host;
            if (formData.port !== initialData.port) updateData.port = formData.port;
            if (formData.database_name !== initialData.database_name) updateData.database_name = formData.database_name;
            if (formData.username !== initialData.username) updateData.username = formData.username;
            if (formData.password) updateData.password = formData.password;
            await updateConnection(updateData);
            onSuccess();
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

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.checked,
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
        if (!loading && !isTestingConnection) {
            onClose();
        }
    };

    const handleTestConnection = async () => {
        if (!formData.host.trim() || !formData.database_name.trim() || !formData.username.trim()) {
            setTestConnectionNotice({
                type: 'error',
                message: 'Для проверки подключения заполните поля: Хост, Имя БД и Пользователь.',
            });
            return;
        }

        setIsTestingConnection(true);
        setTestConnectionNotice(null);
        try {
            const result = await apiRequest<ConnectionTestResponse>('/api/v1/db_connections/test_connection', {
                method: 'POST',
                body: JSON.stringify({
                    host: formData.host.trim(),
                    port: formData.port,
                    database_name: formData.database_name.trim(),
                    username: formData.username.trim(),
                    password: formData.password,
                }),
                withAuth: true,
            });

            if (result.success) {
                setTestConnectionNotice({
                    type: 'success',
                    message: result.resolved_host
                        ? `Подключение успешно (хост: ${result.resolved_host})`
                        : 'Подключение успешно',
                });
            } else {
                setTestConnectionNotice({
                    type: 'error',
                    message: result.message || 'Не удалось подключиться',
                });
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Не удалось проверить подключение';
            setTestConnectionNotice({
                type: 'error',
                message,
            });
        } finally {
            setIsTestingConnection(false);
        }
    };

    const getErrorMessage = () => {
        if (!error) return null;
        if (error.includes('400') || error.includes('Invalid') || error.includes('Неверный')) {
            return t('password.error.invalid');
        }
        if (error.includes('403')) {
            return t('password.error.forbidden');
        }
        if (error.includes('404')) {
            return t('connections.not_found');
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
                    aria-label={t('connections.edit.title')}
                >
                    <FontAwesomeIcon icon={faTimes}/>
                </button>
                <div className={clsx(styles.modal__header)}>
                    <h2 className={clsx(styles.modal__title)}>
                        {success ? t('connections.edit.updated') : t('connections.edit.title')}
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
                            {t('connections.edit.updated_success')}
                        </div>
                        <div className={clsx(styles.modal__successHint)}>
                            {t('profile.saved_hint')}
                        </div>
                        <button className={clsx(styles.modal__successButton)} onClick={onClose}>
                            OK
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className={clsx(styles.modal__form)}>
                        {error && <div className={clsx(styles.modal__error)}>{getErrorMessage()}</div>}

                        <div className={clsx(styles.modal__formGroup)}>
                            <label htmlFor="name" className={clsx(styles.modal__label)}>
                                {t('connections.edit.name')}
                            </label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                className={clsx(styles.modal__input)}
                                placeholder={t('connections.edit.name_placeholder')}
                                disabled={loading}
                                maxLength={30}
                            />
                        </div>

                        <div className={clsx(styles.modal__formGroup)}>
                            <label htmlFor="description" className={clsx(styles.modal__label)}>
                                {t('connections.edit.description')}
                            </label>
                            <input
                                type="text"
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                className={clsx(styles.modal__input)}
                                placeholder={t('connections.edit.description_placeholder')}
                                disabled={loading}
                                maxLength={100}
                            />
                        </div>

                        {/* Тип базы данных и Окружение в одной строке */}
                        <div className={clsx(styles.modal__formGroup)}>
                            <div className={clsx(styles.modal__dualRow)}>
                                <div className={clsx(styles.modal__dualColumn)}>
                                    <label htmlFor="database_type" className={clsx(styles.modal__label)}>
                                        {t('connections.edit.db_type')}
                                    </label>
                                    <select
                                        id="database_type"
                                        name="database_type"
                                        value={formData.database_type}
                                        onChange={handleChange}
                                        className={clsx(styles.modal__select)}
                                        disabled={loading}
                                    >
                                        <option value="postgresql">PostgreSQL</option>
                                        <option value="greenplum">Greenplum</option>
                                    </select>
                                </div>
                                <div className={clsx(styles.modal__dualColumn)}>
                                    <label htmlFor="environment" className={clsx(styles.modal__label)}>
                                        {t('connections.edit.environment')}
                                    </label>
                                    <select
                                        id="environment"
                                        name="environment"
                                        value={formData.environment}
                                        onChange={handleChange}
                                        className={clsx(styles.modal__select)}
                                        disabled={loading}
                                    >
                                        <option value="development">{t('connections.env.development')}</option>
                                        <option value="testing">{t('connections.env.testing')}</option>
                                        <option value="production">{t('connections.env.production')}</option>
                                        <option value="analytics">{t('connections.env.analytics')}</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className={clsx(styles.modal__formGroup)}>
                            <label htmlFor="database_name" className={clsx(styles.modal__label)}>
                                {t('connections.edit.db_name')}
                            </label>
                            <input
                                type="text"
                                id="database_name"
                                name="database_name"
                                value={formData.database_name}
                                onChange={handleChange}
                                required
                                className={clsx(styles.modal__input)}
                                placeholder="database_name"
                                disabled={loading}
                            />
                        </div>

                        {/* Имя пользователя и Пароль в одной строке */}
                        <div className={clsx(styles.modal__formGroup)}>
                            <div className={clsx(styles.modal__dualRow)}>
                                <div className={clsx(styles.modal__dualColumn)}>
                                    <label htmlFor="username" className={clsx(styles.modal__label)}>
                                        {t('connections.edit.username')}
                                    </label>
                                    <input
                                        type="text"
                                        id="username"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleChange}
                                        required
                                        className={clsx(styles.modal__input)}
                                        placeholder="username"
                                        disabled={loading}
                                    />
                                </div>
                                <div className={clsx(styles.modal__dualColumn)}>
                                    <label htmlFor="password" className={clsx(styles.modal__label)}>
                                        {t('connections.edit.password')}
                                    </label>
                                    <div className={clsx(styles.modal__passwordWrapper)}>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            id="password"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            className={clsx(styles.modal__input)}
                                            placeholder={t('connections.edit.password_placeholder')}
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
                            </div>
                        </div>

                        <div className={clsx(styles.modal__formGroup)}>
                            <label htmlFor="host" className={clsx(styles.modal__label)}>
                                {t('connections.edit.host')}
                            </label>
                            <input
                                type="text"
                                id="host"
                                name="host"
                                value={formData.host}
                                onChange={handleChange}
                                required
                                className={clsx(styles.modal__input)}
                                placeholder="localhost"
                                disabled={loading}
                            />
                        </div>

                        <div className={clsx(styles.modal__formGroup)}>
                            <label htmlFor="port" className={clsx(styles.modal__label)}>
                                {t('connections.edit.port')}
                            </label>
                            <input
                                type="number"
                                id="port"
                                name="port"
                                value={formData.port}
                                onChange={handleChange}
                                required
                                className={clsx(styles.modal__input)}
                                placeholder="5432"
                                disabled={loading}
                            />
                        </div>

                        <div className={clsx(styles.modal__formGroup)}>
                            <label className={clsx(styles.modal__label)}>
                                <input
                                    type="checkbox"
                                    name="is_favorite"
                                    checked={formData.is_favorite}
                                    onChange={handleCheckboxChange}
                                    disabled={loading}
                                    style={{marginRight: '8px'}}
                                />
                                {t('connections.edit.favorite')}
                            </label>
                        </div>

                        {testConnectionNotice && (
                            <div
                                className={clsx(
                                    styles.modal__notice,
                                    testConnectionNotice.type === 'success' ? styles.modal__notice_success : styles.modal__notice_error,
                                )}
                            >
                                {testConnectionNotice.message}
                            </div>
                        )}

                        <div className={clsx(styles.modal__formFooter)}>
                            <button
                                type="button"
                                className={clsx(styles.modal__cancelButton)}
                                onClick={handleClose}
                                disabled={loading || isTestingConnection}
                            >
                                {t('login.cancel')}
                            </button>
                            <button
                                type="button"
                                className={clsx(styles.modal__testButton)}
                                onClick={handleTestConnection}
                                disabled={loading || isTestingConnection}
                            >
                                {isTestingConnection ? (
                                    <>
                                        <FontAwesomeIcon icon={faSpinner} spin/>
                                        Проверка...
                                    </>
                                ) : 'Проверить подключение'}
                            </button>
                            <button
                                type="submit"
                                className={clsx(styles.modal__submitButton)}
                                disabled={!isFormChanged() || loading || isTestingConnection}
                            >
                                {loading ? (
                                    <>
                                        <FontAwesomeIcon icon={faSpinner} spin/>
                                        {t('profile.saving')}
                                    </>
                                ) : (
                                    t('profile.save')
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
