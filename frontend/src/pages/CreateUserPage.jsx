// src/pages/RegisterPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

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
  const [success, setSuccess] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.username || formData.username.length < 3) {
      newErrors.username = 'Логин должен содержать минимум 3 символа';
    }
    if (!formData.email) {
      newErrors.email = 'Email обязателен';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Неверный формат email';
    }
    if (!formData.password) {
      newErrors.password = 'Пароль обязателен';
    } else if (formData.password.length < 4) {
      newErrors.password = 'Пароль должен быть не короче 4 символов';
    }
    if (formData.password !== formData.password2) {
      newErrors.password2 = 'Пароли не совпадают';
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
      // is_active и is_superuser НЕ отправляются — они всегда False на бэкенде при создании
    };

    try {
      await axios.post('http://localhost:8000/api/v1/users/', payload);
      setSuccess(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      let errorMsg = 'Ошибка при регистрации';
      if (err.response?.data?.detail) {
        errorMsg = err.response.data.detail;
      }
      setErrors({ form: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  // Password strength (optional visual feedback)
  const getPasswordStrength = (password) => {
    if (password.length < 4) return { text: 'Слишком короткий', class: 'weak', segments: 0 };
    let score = 0;
    if (password.length >= 6) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 1) return { text: 'Слабый', class: 'weak', segments: 1 };
    if (score === 2) return { text: 'Средний', class: 'medium', segments: 2 };
    if (score >= 3) return { text: 'Хороший', class: 'strong', segments: 4 };
    return { text: '', class: '', segments: 0 };
  };

  const strength = getPasswordStrength(formData.password);

  if (success) {
    return (
      <section className="register-section">
        <div className="register-container" style={{ textAlign: 'center' }}>
          <h2>✅ Регистрация успешна!</h2>
          <p>Перенаправление на главную страницу...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="register-section">
      <div className="register-container">
        <div className="register-header">
          <h1>Регистрация в DB HUB</h1>
        </div>

        {errors.form && (
          <div className="alert alert-danger">
            <p>{errors.form}</p>
          </div>
        )}

        <form className="register-form" onSubmit={handleSubmit} noValidate>

          <div className="form-section">
            <h2 className="section-title">Основные данные</h2>

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
              />
              {errors.username ? (
                <div className="error-message">
                  <i className="fas fa-exclamation-circle"></i>
                  {errors.username}
                </div>
              ) : (
                <div className="form-hint">Только латинские буквы, цифры и подчеркивания</div>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  <i className="fas fa-lock"></i>
                  Пароль
                </label>
                <div className="password-wrapper">
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={errors.password ? 'error' : ''}
                  />
                  {/* Eye icon можно добавить позже */}
                </div>
                {errors.password ? (
                  <div className="error-message">
                    <i className="fas fa-exclamation-circle"></i>
                    {errors.password}
                  </div>
                ) : (
                  <div className="password-strength">
                    <div className="strength-bar">
                      {[...Array(4)].map((_, i) => (
                        <div
                          key={i}
                          className={`strength-segment ${i < strength.segments ? strength.class : ''}`}
                        ></div>
                      ))}
                    </div>
                    <div className="strength-text">{strength.text || 'Введите пароль'}</div>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">
                  <i className="fas fa-lock"></i>
                  Подтверждение пароля
                </label>
                <div className="password-wrapper">
                  <input
                    type="password"
                    name="password2"
                    value={formData.password2}
                    onChange={handleChange}
                    className={errors.password2 ? 'error' : ''}
                  />
                </div>
                {errors.password2 && (
                  <div className="error-message">
                    <i className="fas fa-exclamation-circle"></i>
                    {errors.password2}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2 className="section-title">Дополнительная информация</h2>

            <div className="form-group">
              <label className="form-label">
                <i className="fas fa-user"></i>
                ФИО
              </label>
              <input
                type="text"
                name="fio"
                value={formData.fio}
                onChange={handleChange}
              />
              {errors.fio && (
                <div className="error-message">
                  <i className="fas fa-exclamation-circle"></i>
                  {errors.fio}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">
                <i className="fas fa-envelope"></i>
                Электронная почта
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

            <div className="form-group">
              <label className="form-label">
                <i className="fas fa-briefcase"></i>
                Роль
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="role-select"
              >
                {ROLES.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
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
                  <i className="fas fa-user-plus"></i>
                  Зарегистрироваться
                </>
              )}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-large"
              onClick={() => navigate('/')}
            >
              <i className="fas fa-arrow-left"></i>
              Назад к входу
            </button>
          </div>

          <div className="login-link">
            <p>Уже есть аккаунт? <button type="button" onClick={() => navigate('/login')} className="link-button">Войдите в систему</button></p>
          </div>
        </form>
      </div>
    </section>
  );
};

export default RegisterPage;