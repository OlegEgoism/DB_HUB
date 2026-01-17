// src/pages/RegisterPage.jsx
import React, {useState, useEffect, useRef} from 'react';
import {useNavigate} from 'react-router-dom';
import axios from 'axios';
import Header from '../components/Header';
import Footer from "../components/Footer";

const ROLES = [
    "Пользователь",
    "Разработчик",
    "Аналитик",
    "Тестировщик",
    "Администратор БД"
];

const RegisterPage = () => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        fio: '',
        role: 'Пользователь',
        password: '',
        password2: ''
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [showPassword1, setShowPassword1] = useState(false);
    const [showPassword2, setShowPassword2] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [roleOpen, setRoleOpen] = useState(false);
    const navigate = useNavigate();
    const selectRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (selectRef.current && !selectRef.current.contains(event.target)) {
                setRoleOpen(false);
            }
        };
        if (roleOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [roleOpen]);

    const handleChange = (e) => {
        const {name, value} = e.target;
        if (name === 'username') {
            if (value && !/^[a-zA-Z0-9_]*$/.test(value)) {
                return;
            }
        }
        setFormData(prev => ({...prev, [name]: value}));
        if (errors[name]) {
            setErrors(prev => ({...prev, [name]: ''}));
        }
    };

    const togglePassword = (field) => {
        if (field === 'password1') setShowPassword1(!showPassword1);
        if (field === 'password2') setShowPassword2(!showPassword2);
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.username) {
            newErrors.username = "Логин обязателен";
        } else if (formData.username.length < 3) {
            newErrors.username = "Логин должен содержать минимум 3 символа";
        } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
            newErrors.username = "Логин может содержать только латинские буквы, цифры и подчеркивания (_)";
        }
        if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = "Неверный формат email";
        }
        if (!formData.password) {
            newErrors.password = "Пароль обязателен";
        } else if (formData.password.length < 4) {
            newErrors.password = "Пароль должен быть не короче 4 символов";
        }
        if (formData.password !== formData.password2) {
            newErrors.password2 = "Пароли не совпадают";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        setLoading(true);
        const payload = {
            username: formData.username,
            email: formData.email,
            fio: formData.fio || null,
            role: formData.role,
            password: formData.password
        };
        try {
            await axios.post('http://localhost:8000/api/v1/app_users/', payload);
            setShowModal(true);
        } catch (err) {
            let msg = 'Ошибка при регистрации';
            if (err.response?.data?.detail) {
                msg = err.response.data.detail;
            }
            setErrors({form: msg});
        } finally {
            setLoading(false);
        }
    };

    const getPasswordStrength = (password) => {
        if (password.length < 4) return {text: 'Слишком короткий', class: 'weak'};
        let score = 0;
        if (password.length >= 6) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/\d/.test(password)) score++;
        if (/[!@#$%^&*]/.test(password)) score++;
        if (score <= 1) return {text: 'Слабый', class: 'weak'};
        if (score === 2) return {text: 'Средний', class: 'medium'};
        return {text: 'Хороший', class: 'strong'};
    };

    const strength = getPasswordStrength(formData.password);

    return (
        <>
            <Header/>
            <section className="register-section">
                <div className="register-container">
                    <div className="register-header">
                        <h1>Регистрация</h1>
                    </div>
                    {errors.form && (<div className="alert">{errors.form}</div>)}
                    <form className="register-form" onSubmit={handleSubmit} noValidate>
                        <div className="form-section">
                            <h2 className="section-title">Поля для ввода (* обязательные поля)</h2>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">
                                        <i className="fas fa-user"></i>
                                        Логин*
                                    </label>
                                    <input
                                        type="text"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleChange}
                                        className={errors.username ? 'error' : ''}
                                    />
                                    {errors.username ? (
                                        <div className="error-message">
                                            <i className="fas fa-exclamation-circle"></i>
                                            {errors.username}
                                        </div>
                                    ) : (
                                        <div className="form-hint">Латинские буквы, цифры и подчеркивания</div>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label className="form-label">
                                        <i className="fas fa-briefcase"></i>
                                        Роль*
                                    </label>
                                    <div className="custom-select-wrapper" ref={selectRef}>
                                        <div
                                            className="custom-select"
                                            onClick={() => setRoleOpen(!roleOpen)}
                                            tabIndex={0}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    setRoleOpen(!roleOpen);
                                                }
                                            }}
                                        >
                                            <span>{formData.role}</span>
                                            <i className={`fas fa-chevron-${roleOpen ? 'up' : 'down'}`}></i>
                                        </div>
                                        {roleOpen && (
                                            <ul className="custom-select-options">
                                                {ROLES.map((role) => (
                                                    <li
                                                        key={role}
                                                        className={`custom-select-option ${formData.role === role ? 'active' : ''}`}
                                                        onClick={() => {
                                                            setFormData(prev => ({...prev, role}));
                                                            setRoleOpen(false);
                                                            if (errors.role) {
                                                                setErrors(prev => ({...prev, role: ''}));
                                                            }
                                                        }}
                                                    >
                                                        {role}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                    <div className="form-hint">Укажите свою должность</div>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">
                                        <i className="fas fa-lock"></i>
                                        Пароль*
                                    </label>
                                    <div className="password-wrapper">
                                        <input
                                            type={showPassword1 ? 'text' : 'password'}
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            className={errors.password ? 'error' : ''}
                                        />
                                        <button
                                            type="button"
                                            className="toggle-password"
                                            onClick={() => togglePassword('password1')}
                                        >
                                            <i className={showPassword1 ? 'fas fa-eye-slash' : 'fas fa-eye'}></i>
                                        </button>
                                    </div>
                                    {errors.password ? (
                                        <div className="error-message">
                                            <i className="fas fa-exclamation-circle"></i>
                                            {errors.password}
                                        </div>
                                    ) : formData.password && (
                                        <div className="password-strength">
                                            <div className="strength-text">{strength.text}</div>
                                        </div>
                                    )}
                                    <div className="form-hint">Минимум 4 символа</div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">
                                        <i className="fas fa-lock"></i>
                                        Подтверждение пароля*
                                    </label>
                                    <div className="password-wrapper">
                                        <input
                                            type={showPassword2 ? 'text' : 'password'}
                                            name="password2"
                                            value={formData.password2}
                                            onChange={handleChange}
                                            className={errors.password2 ? 'error' : ''}
                                        />
                                        <button
                                            type="button"
                                            className="toggle-password"
                                            onClick={() => togglePassword('password2')}
                                        >
                                            <i className={showPassword2 ? 'fas fa-eye-slash' : 'fas fa-eye'}></i>
                                        </button>
                                    </div>
                                    {errors.password2 && (
                                        <div className="error-message">
                                            <i className="fas fa-exclamation-circle"></i>
                                            {errors.password2}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">
                                    <i className="fas fa-signature"></i>
                                    ФИО
                                </label>
                                <input
                                    type="text"
                                    name="fio"
                                    value={formData.fio}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">
                                    <i className="fas fa-envelope"></i>
                                    Электронная почта*
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className={errors.email ? 'error' : ''}
                                />
                                {errors.email && (
                                    <div className="error-message">
                                        <i className="fas fa-exclamation-circle"></i>
                                        {errors.email}
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
                                        <i className="fas fa-user-plus"></i>
                                        Зарегистрироваться
                                    </>
                                )}
                            </button>
                        </div>

                        <div>
                            <h2 className="section-title">
                                Есть аккаунт?
                            </h2>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => navigate('/login')}
                            >
                                <i className="fas fa-sign-in-alt"></i>
                                Войти
                            </button>
                        </div>
                    </form>
                </div>

                {/* Модальное окно */}
                {showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-icon">
                                <i className="fas fa-hourglass-half"></i>
                            </div>
                            <h3>Ожидайте подтверждения регистрации администратором.</h3>
                            <div>
                                <button
                                    className="btn btn-primary"
                                    onClick={() => {
                                        setShowModal(false);
                                        navigate('/login');
                                    }}
                                >
                                    Понятно
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </section>
            <Footer/>
        </>
    );
};

export default RegisterPage;