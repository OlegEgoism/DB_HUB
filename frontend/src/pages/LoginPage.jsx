// src/pages/LoginPage.jsx
import React, {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import axios from 'axios';
import Header from '../components/Header';
import Footer from "../components/Footer";

const LoginPage = () => {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        remember: false
    });
    const [errors, setErrors] = useState({
        username: '',
        password: '',
        general: ''
    });
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const navigate = useNavigate();

    // Валидация формы
    const validateForm = () => {
        const newErrors = {
            username: '',
            password: '',
            general: ''
        };
        let isValid = true;

        // Проверка логина
        if (!formData.username.trim()) {
            newErrors.username = 'Пожалуйста, введите логин';
            isValid = false;
        } else if (formData.username.trim().length < 3) {
            newErrors.username = 'Логин должен содержать минимум 3 символа';
            isValid = false;
        }

        // Проверка пароля
        if (!formData.password) {
            newErrors.password = 'Пожалуйста, введите пароль';
            isValid = false;
        } else if (formData.password.length < 4) {
            newErrors.password = 'Пароль должен содержать минимум 4 символа';
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleChange = (e) => {
        const {name, value, type, checked} = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));

        // Очистка ошибки для конкретного поля при изменении
        if (errors[name] || errors.general) {
            setErrors(prev => ({
                ...prev,
                [name]: '',
                general: ''
            }));
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Валидация формы перед отправкой
        if (!validateForm()) {
            return;
        }

        setLoading(true);
        setErrors(prev => ({...prev, general: ''}));

        try {
            const response = await axios.post('http://localhost:8000/api/v1/auth/login', {
                username: formData.username.trim(),
                password: formData.password
            }, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                transformRequest: (data) => {
                    const params = new URLSearchParams();
                    params.append('username', data.username);
                    params.append('password', data.password);
                    return params.toString();
                }
            });

            localStorage.setItem('access_token', response.data.token.access_token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            navigate('/');
        } catch (err) {
            if (err.response?.data?.detail) {
                setErrors(prev => ({
                    ...prev,
                    general: err.response.data.detail
                }));
            } else if (err.code === 'ERR_NETWORK') {
                setErrors(prev => ({
                    ...prev,
                    general: 'Ошибка подключения к серверу. Проверьте соединение.'
                }));
            } else {
                setErrors(prev => ({
                    ...prev,
                    general: 'Ошибка при входе. Пожалуйста, попробуйте еще раз.'
                }));
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Header/>
            <section className="login-section">
                <div className="login-container">
                    <div className="login-header">
                        <h1>Авторизация</h1>
                    </div>

                    {/* Общая ошибка */}
                    {errors.general && (
                        <div className="alert">
                            <p>{errors.general}</p>
                        </div>
                    )}

                    <form className="login-form" onSubmit={handleSubmit} noValidate>
                        <div className="form-section">
                            <h2 className="section-title">Поля авторизации</h2>

                            <div className="form-group">
                                <label className="form-label">
                                    <i className="fas fa-user"></i>
                                    Логин
                                </label>
                                <input
                                    type="text"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    className={errors.username ? 'error' : ''}
                                    required
                                />
                                {errors.username && (
                                    <div className="error-message">
                                        <i className="fas fa-exclamation-circle"></i>
                                        {errors.username}
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label className="form-label">
                                    <i className="fas fa-lock"></i>
                                    Пароль
                                </label>
                                <div className="password-wrapper">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        className={errors.password ? 'error' : ''}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="toggle-password"
                                        onClick={togglePasswordVisibility}
                                    >
                                        <i className={showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'}></i>
                                    </button>
                                </div>
                                {errors.password && (
                                    <div className="error-message">
                                        <i className="fas fa-exclamation-circle"></i>
                                        {errors.password}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                className={`btn btn-primary ${loading ? 'btn-loading' : ''}`}
                                disabled={loading}
                            >
                                {loading ? '' : (
                                    <>
                                        <i className="fas fa-sign-in-alt"></i>
                                        Войти
                                    </>
                                )}
                            </button>
                        </div>

                        <div>
                            <h2 className="section-title">
                                Нет аккаунта?
                            </h2>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => navigate('/register')}
                            >
                                <i className="fas fa-user-plus"></i>
                                Зарегистрироваться
                            </button>
                        </div>
                    </form>
                </div>
            </section>
            <Footer/>
        </>
    );
};

export default LoginPage;