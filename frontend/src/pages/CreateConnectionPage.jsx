// src/pages/CreateConnectionPage.jsx
import React, {useState, useEffect, useRef} from 'react';
import {useNavigate} from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

const ENVIRONMENTS = [
    "production",
    "development",
    "testing",
    "analytics"
];

const DATABASE_TYPES = [
    "postgresql"
];

const CreateConnectionPage = () => {
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

    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

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

    // Получение ID текущего пользователя
    useEffect(() => {
        const getCurrentUser = async () => {
            const token = localStorage.getItem('access_token');
            if (!token) {
                navigate('/login');
                return;
            }

            try {
                // Попробуем получить информацию о пользователе из localStorage
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    const userData = JSON.parse(userStr);
                    setCurrentUser(userData);
                    setFormData(prev => ({
                        ...prev,
                        owner_id: userData.id
                    }));
                    setLoading(false);
                    return;
                }

                // Если нет в localStorage, запрашиваем с сервера
                const response = await fetch('http://localhost:8000/api/v1/users/me', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    const userData = await response.json();
                    setCurrentUser(userData);
                    setFormData(prev => ({
                        ...prev,
                        owner_id: userData.id
                    }));
                    localStorage.setItem('user', JSON.stringify(userData));
                } else {
                    console.error('Не удалось получить информацию о пользователе');
                }
            } catch (err) {
                console.error('Ошибка получения пользователя:', err);
            } finally {
                setLoading(false);
            }
        };

        getCurrentUser();
    }, [navigate]);

    const handleChange = (e) => {
        const {name, value, type, checked} = e.target;

        if (type === 'checkbox') {
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
        if (!formData.password.trim()) {
            setError('Пароль обязателен');
            return false;
        }
        if (isNaN(Number(formData.port)) || formData.port <= 0 || formData.port > 65535) {
            setError('Порт должен быть числом от 1 до 65535');
            return false;
        }
        if (!formData.owner_id) {
            setError('Не удалось определить владельца подключения. Пожалуйста, перезайдите в систему.');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        const token = localStorage.getItem('access_token');
        if (!token) {
            setError('Требуется авторизация');
            navigate('/login');
            return;
        }

        setSubmitting(true);
        setError('');
        setSuccess(false);

        try {
            // Подготавливаем payload с правильными типами данных
            const payload = {
                name: formData.name.trim(),
                description: formData.description.trim() || null, // Если пустое, отправляем null
                database_type: formData.database_type,
                environment: formData.environment,
                is_favorite: Boolean(formData.is_favorite),
                host: formData.host.trim(),
                port: parseInt(formData.port, 10),
                database_name: formData.database_name.trim(),
                username: formData.username.trim(),
                password: formData.password,
                owner_id: parseInt(formData.owner_id, 10) // Убедимся, что это число
            };

            console.log('Отправляемые данные:', payload); // Для отладки

            const response = await fetch('http://localhost:8000/api/v1/db_connections/', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                console.error('Детали ошибки от сервера:', errData); // Для отладки
                throw new Error(errData.detail || `Ошибка при создании подключения: ${response.status}`);
            }

            const result = await response.json();
            console.log('Успешный ответ:', result); // Для отладки
            setSuccess(true);

            // Перенаправление на домашнюю страницу через 2 секунды
            setTimeout(() => {
                navigate('/');
            }, 2000);

        } catch (err) {
            console.error('Полная ошибка создания подключения:', err);
            setError(err.message || 'Неизвестная ошибка при создании подключения');
        } finally {
            setSubmitting(false);
        }
    };

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

    const handleCancel = () => {
        if (window.confirm('Вы уверены? Все несохранённые изменения будут потеряны.')) {
            navigate(-1);
        }
    };

    // Показываем индикатор загрузки, если ещё не определили пользователя
    if (loading) {
        return (
            <>
                <Header isAuthenticated={true}/>
                <section className="register-section">
                    <div className="register-container">
                        <div className="loading-message">
                            <i className="fas fa-spinner fa-spin"></i> Загрузка...
                        </div>
                    </div>
                </section>
                <Footer/>
            </>
        );
    }

    // Проверяем, что у нас есть ID пользователя
    if (!formData.owner_id && !loading) {
        return (
            <>
                <Header isAuthenticated={true}/>
                <section className="register-section">
                    <div className="register-container">
                        <div className="alert alert-error">
                            <i className="fas fa-exclamation-circle"></i>
                            <p>Не удалось определить ваши данные. Пожалуйста, перезайдите в систему.</p>
                            <button
                                className="btn btn-primary"
                                onClick={() => {
                                    localStorage.removeItem('access_token');
                                    localStorage.removeItem('user');
                                    navigate('/login');
                                }}
                            >
                                Войти снова
                            </button>
                        </div>
                    </div>
                </section>
                <Footer/>
            </>
        );
    }

    return (
        <>
            <Header isAuthenticated={true}/>
            <section className="register-section">
                <div className="register-container">
                    <div className="register-header">
                        <h1>Создание нового подключения</h1>

                    </div>

                    {error && (
                        <div className="alert alert-error">
                            <i className="fas fa-exclamation-circle"></i>
                            <p>{error}</p>
                        </div>
                    )}

                    {success && (
                        <div className="alert alert-success">
                            <i className="fas fa-check-circle"></i>
                            <p>Подключение успешно создано! Перенаправление на главную страницу...</p>
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
                                        value={formData.port}
                                        onChange={handleChange}
                                        min="1"
                                        max="65535"
                                        required
                                        disabled={submitting}
                                    />
                                </div>
                            </div>

                            <div className="form-row">
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
                            </div>

                            <div className="form-group">
                                <label className="form-label">
                                    <i className="fas fa-key"></i> Пароль*
                                </label>
                                <div className="password-input-wrapper">
                                    <input
                                        type="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        required
                                        disabled={submitting}
                                    />
                                </div>
                                <div className="form-hint">Пароль шифруется перед сохранением</div>
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


                        <div className="header-actions">
                            <button
                                type="submit"
                                className={`btn btn-primary ${submitting ? 'btn-loading' : ''}`}
                                disabled={submitting || loading}
                            >
                                {submitting ? (
                                    <>
                                        <i className="fas fa-spinner fa-spin"></i> Создание...
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
                                onClick={handleCancel}
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

export default CreateConnectionPage;