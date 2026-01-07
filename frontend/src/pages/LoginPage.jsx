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
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const navigate = useNavigate();

    const handleChange = (e) => {
        const {name, value, type, checked} = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        if (error) setError('');
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await axios.post('http://localhost:8000/api/v1/auth/login', {
                username: formData.username,
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
                setError(err.response.data.detail);
            } else {
                setError('Ошибка при входе. Проверьте подключение к серверу.');
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
                        <h1>Вход в DB HUB</h1>
                    </div>

                    {error && (
                        <div className="alert alert-danger">
                            <p>{error}</p>
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
                                    required
                                />
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
                            </div>
                        </div>

                        <div className="form-actions">
                            <button
                                type="submit"
                                className={`btn btn-primary btn-large ${loading ? 'btn-loading' : ''}`}
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
                                className="btn btn-primary btn-large"
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