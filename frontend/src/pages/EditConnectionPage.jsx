// src/pages/EditConnectionPage.jsx
import React, {useState, useEffect, useRef} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

const ENVIRONMENTS = [
    "production",
    "development",
    "testing",
    "analytics"
];

const DATABASE_TYPES = [
    "postgresql",
    "greenplum"
];

const EditConnectionPage = () => {
    const {id} = useParams(); // connection_id из URL
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        database_type: 'postgresql',
        environment: 'development',
        is_favorite: false,
        host: '',
        port: 5432,
        database_name: '',
        username: '',
        password: '',
        owner_id: null
    });

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const envSelectRef = useRef(null);
    const dbTypeSelectRef = useRef(null);
    const [envOpen, setEnvOpen] = useState(false);
    const [dbTypeOpen, setDbTypeOpen] = useState(false);

    // Закрытие выпадающих списков при клике вне
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (envSelectRef.current && !envSelectRef.current.contains(event.target)) {
                setEnvOpen(false);
            }
            if (dbTypeSelectRef.current && !dbTypeSelectRef.current.contains(event.target)) {
                setDbTypeOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Загрузка данных подключения
    useEffect(() => {
        const loadConnection = async () => {
            const token = localStorage.getItem('access_token');
            if (!token) {
                navigate('/login');
                return;
            }

            try {
                const response = await fetch(`http://localhost:8000/api/v1/db_connections/${id}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    const err = await response.json().catch(() => ({}));
                    throw new Error(err.detail || 'Не удалось загрузить подключение');
                }

                const data = await response.json();
                setFormData({
                    name: data.name || '',
                    description: data.description || '',
                    database_type: data.database_type || 'postgresql',
                    environment: data.environment || 'development',
                    is_favorite: data.is_favorite || false,
                    host: data.host || '',
                    port: data.port || 5432,
                    database_name: data.database_name || '',
                    username: data.username || '',
                    password: '', //
                    owner_id: data.owner_id
                });
            } catch (err) {
                setError(err.message);
                console.error('Ошибка загрузки подключения:', err);
            } finally {
                setLoading(false);
            }
        };

        loadConnection();
    }, [id, navigate]);

    const handleChange = (e) => {
        const {name, value, type, checked} = e.target;

        if (type === 'checkbox') {
            // Обработка чекбокса
            setFormData(prev => ({
                ...prev,
                [name]: checked
            }));
        } else if (name === 'port') {
            const numericValue = value.replace(/[^0-9]/g, '');
            if (numericValue.length > 5) return;
            setFormData(prev => ({
                ...prev,
                port: numericValue === '' ? '' : parseInt(numericValue, 10)
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }

        if (error) setError('');
    };

    const handleEnvSelect = (env) => {
        setFormData(prev => ({...prev, environment: env}));
        setEnvOpen(false);
        if (error) setError('');
    };

    const handleDbTypeSelect = (type) => {
        setFormData(prev => ({...prev, database_type: type}));
        setDbTypeOpen(false);
        if (error) setError('');
    };

    const validate = () => {
        if (!formData.name.trim()) {
            setError('Название подключения обязательно');
            return false;
        }
        if (!formData.host.trim()) {
            setError('Хост обязателен');
            return false;
        }
        if (!formData.database_name.trim()) {
            setError('Имя базы данных обязательно');
            return false;
        }
        if (!formData.username.trim()) {
            setError('Имя пользователя обязательно');
            return false;
        }
        if (isNaN(Number(formData.port)) || formData.port <= 0) {
            setError('Порт должен быть положительным числом');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        const token = localStorage.getItem('access_token');
        setSubmitting(true);
        setError('');
        setSuccess(false);

        try {
            const payload = {
                name: formData.name,
                description: formData.description,
                database_type: formData.database_type,
                environment: formData.environment,
                is_favorite: formData.is_favorite, // Это уже boolean значение
                host: formData.host,
                port: parseInt(formData.port, 10),
                database_name: formData.database_name,
                username: formData.username,
                password: formData.password || undefined, // отправляем только если указан
                owner_id: formData.owner_id
            };

            const response = await fetch(`http://localhost:8000/api/v1/db_connections/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.detail || 'Ошибка при обновлении подключения');
            }

            setSuccess(true);
            setTimeout(() => {
                navigate('/'); // или '/connections', если у вас есть отдельная страница
            }, 1500);
        } catch (err) {
            setError(err.message);
            console.error('Ошибка обновления:', err);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <>
                <Header isAuthenticated={true}/>
                <section className="register-section">
                    <div className="register-container">
                        <p>Загрузка подключения...</p>
                    </div>
                </section>
                <Footer/>
            </>
        );
    }

    if (error && !formData.name) {
        return (
            <>
                <Header isAuthenticated={true}/>
                <section className="register-section">
                    <div className="register-container">
                        <p className="text-danger">Ошибка: {error}</p>
                    </div>
                </section>
                <Footer/>
            </>
        );
    }

    // Вспомогательные функции для отображения
    const getEnvLabel = (env) => {
        switch (env) {
            case 'production':
                return 'Продакшен';
            case 'development':
                return 'Разработка';
            case 'testing':
                return 'Тестирование';
            case 'analytics':
                return 'Аналитика';
            default:
                return env;
        }
    };

    return (
        <>
            <Header isAuthenticated={true}/>
            <section className="register-section">
                <div className="register-container">
                    <div className="register-header">
                        <h1>Редактирование подключения</h1>
                    </div>

                    {error && (
                        <div className="alert">
                            <p>{error}</p>
                        </div>
                    )}

                    {success && (
                        <div className="alert alert-success">
                            <p>Подключение успешно обновлено!</p>
                        </div>
                    )}

                    <form className="register-form" onSubmit={handleSubmit}>
                        <div className="form-section">
                            <h2 className="section-title">Основная информация (* обязательные поля)</h2>

                            <div className="form-group">
                                <label className="form-label">
                                    <i className="fas fa-tag"></i> Название подключения*
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    disabled={submitting}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">
                                    <i className="fas fa-comment"></i> Описание
                                </label>
                                <input
                                    type="text"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    disabled={submitting}
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">
                                        <i className="fas fa-database"></i> Тип СУБД*
                                    </label>
                                    <div className="custom-select-wrapper" ref={dbTypeSelectRef}>
                                        <div
                                            className="custom-select"
                                            onClick={() => !submitting && setDbTypeOpen(!dbTypeOpen)}
                                            tabIndex={0}
                                            onKeyDown={(e) => {
                                                if (!submitting && (e.key === 'Enter' || e.key === ' ')) {
                                                    setDbTypeOpen(!dbTypeOpen);
                                                }
                                            }}
                                            style={{cursor: submitting ? 'not-allowed' : 'pointer'}}
                                        >
                                            <span>{formData.database_type.toUpperCase()}</span>
                                            <i className={`fas fa-chevron-${dbTypeOpen ? 'up' : 'down'}`}></i>
                                        </div>
                                        {dbTypeOpen && (
                                            <ul className="custom-select-options">
                                                {DATABASE_TYPES.map((type) => (
                                                    <li
                                                        key={type}
                                                        className={`custom-select-option ${
                                                            formData.database_type === type ? 'active' : ''
                                                        }`}
                                                        onClick={() => !submitting && handleDbTypeSelect(type)}
                                                        style={{cursor: submitting ? 'not-allowed' : 'pointer'}}
                                                    >
                                                        {type.toUpperCase()}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">
                                        <i className="fas fa-layer-group"></i> Среда*
                                    </label>
                                    <div className="custom-select-wrapper" ref={envSelectRef}>
                                        <div
                                            className="custom-select"
                                            onClick={() => !submitting && setEnvOpen(!envOpen)}
                                            tabIndex={0}
                                            onKeyDown={(e) => {
                                                if (!submitting && (e.key === 'Enter' || e.key === ' ')) {
                                                    setEnvOpen(!envOpen);
                                                }
                                            }}
                                            style={{cursor: submitting ? 'not-allowed' : 'pointer'}}
                                        >
                                            <span>{getEnvLabel(formData.environment)}</span>
                                            <i className={`fas fa-chevron-${envOpen ? 'up' : 'down'}`}></i>
                                        </div>
                                        {envOpen && (
                                            <ul className="custom-select-options">
                                                {ENVIRONMENTS.map((env) => (
                                                    <li
                                                        key={env}
                                                        className={`custom-select-option ${
                                                            formData.environment === env ? 'active' : ''
                                                        }`}
                                                        onClick={() => !submitting && handleEnvSelect(env)}
                                                        style={{cursor: submitting ? 'not-allowed' : 'pointer'}}
                                                    >
                                                        {getEnvLabel(env)}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="form-section">
                            <h2 className="section-title">Параметры подключения (* обязательные поля)</h2>

                            <div className="form-group">
                                <label className="form-label">
                                    <i className="fas fa-database"></i> Имя базы данных*
                                </label>
                                <input
                                    type="text"
                                    name="database_name"
                                    value={formData.database_name}
                                    onChange={handleChange}
                                    required
                                    disabled={submitting}
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">
                                        <i className="fas fa-server"></i> Хост*
                                    </label>
                                    <input
                                        type="text"
                                        name="host"
                                        value={formData.host}
                                        onChange={handleChange}
                                        required
                                        disabled={submitting}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">
                                        <i className="fas fa-plug"></i> Порт*
                                    </label>
                                    <input
                                        type="text"
                                        name="port"
                                        value={formData.port === '' ? '' : formData.port}
                                        onChange={handleChange}
                                        placeholder="Напр. 5432"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        required
                                        disabled={submitting}
                                    />
                                </div>
                            </div>


                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">
                                        <i className="fas fa-user"></i> Пользователь*
                                    </label>
                                    <input
                                        type="text"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleChange}
                                        required
                                        disabled={submitting}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">
                                        <i className="fas fa-key"></i> Пароль
                                    </label>
                                    <input
                                        type="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        disabled={submitting}
                                    />
                                    <div className="form-hint">Укажите новый пароль только при изменении</div>
                                </div>
                            </div>

                            <div className="form-section">
                                <h2 className="section-title">Избранное</h2>
                                <label className="form-label">
                                    <input
                                        type="checkbox"
                                        name="is_favorite"
                                        checked={formData.is_favorite}
                                        onChange={handleChange}
                                        disabled={submitting}
                                    />
                                    <i className="fas fa-star"></i>
                                    Добавить в избранное
                                </label>
                            </div>
                        </div>

                        <div className="header-actions">
                            <button
                                type="submit"
                                className={`btn btn-primary ${submitting ? 'btn-loading' : ''}`}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <>
                                        <i className="fas fa-spinner fa-spin"></i> Сохранение...
                                    </>
                                ) : (
                                    <>
                                        Сохранить
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                className="btn btn-danger"
                                onClick={() => navigate(-1)}
                                disabled={submitting}
                            >
                                Отмена
                            </button>
                        </div>
                    </form>
                </div>
            </section>
            <Footer/>
        </>
    );
};

export default EditConnectionPage;