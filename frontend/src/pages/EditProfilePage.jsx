// src/pages/EditProfilePage.jsx
import React, {useState, useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

const ROLES = [
    "Пользователь",
    "Разработчик",
    "Аналитик",
    "Тестировщик",
    "Администратор БД"
];

const EditProfilePage = () => {
    const [formData, setFormData] = useState({
        email: '',
        fio: '',
        role: ''
    });
    const [user, setUser] = useState(null); // полный объект пользователя
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [roleOpen, setRoleOpen] = useState(false);
    const navigate = useNavigate();

    // Загрузка данных пользователя
    useEffect(() => {
        const loadUserProfile = async () => {
            const token = localStorage.getItem('access_token');
            const storedUser = localStorage.getItem('user');

            if (!token || !storedUser) {
                navigate('/login');
                return;
            }

            try {
                const parsedUser = JSON.parse(storedUser);
                const userId = parsedUser.id;

                const response = await fetch(`http://localhost:8000/api/v1/users/${userId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error('Не удалось загрузить профиль');
                }

                const userData = await response.json();
                setUser(userData);

                setFormData({
                    email: userData.email || '',
                    fio: userData.fio || '',
                    role: userData.role || 'Пользователь'
                });
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        loadUserProfile();
    }, [navigate]);

    const handleChange = (e) => {
        const {name, value} = e.target;
        setFormData((prev) => ({...prev, [name]: value}));
        if (error) setError('');
    };

    const handleRoleSelect = (role) => {
        setFormData((prev) => ({...prev, role}));
        setRoleOpen(false);
        if (error) setError('');
    };

    const validate = () => {
        if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
            setError('Неверный формат email');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate() || !user) return;

        const token = localStorage.getItem('access_token');
        const storedUser = JSON.parse(localStorage.getItem('user'));
        const userId = storedUser.id;

        // PUT требует полный объект согласно вашему API
        const payload = {
            email: formData.email,
            fio: formData.fio || null,
            role: formData.role,
            is_active: user.is_active,
            is_superuser: user.is_superuser
        };

        setSubmitting(true);
        setError('');
        setSuccess(false);

        try {
            const response = await fetch(`http://localhost:8000/api/v1/users/${userId}`, {
                method: 'PUT', // ✅ ИСПРАВЛЕНО: теперь PUT
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.detail || 'Ошибка при обновлении профиля');
            }

            const updatedUser = await response.json();

            // Обновляем localStorage
            const newStoredUser = {...storedUser, ...updatedUser};
            localStorage.setItem('user', JSON.stringify(newStoredUser));

            setSuccess(true);
            setTimeout(() => {
                navigate('/profile');
            }, 1500);
        } catch (err) {
            setError(err.message);
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
                        <p>Загрузка данных...</p>
                    </div>
                </section>
                <Footer/>
            </>
        );
    }

    if (error && !user) {
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

    return (
        <>
            <Header isAuthenticated={true}/>
            <section className="register-section">
                <div className="register-container">
                    <div className="register-header">
                        <h1>Редактирование профиля</h1>
                    </div>

                    {error && (
                        <div className="alert">
                            <p>{error}</p>
                        </div>
                    )}

                    {success && (
                        <div
                            className="alert"
                            style={{
                                background: 'rgba(16, 185, 129, 0.1)',
                                borderColor: 'rgba(16, 185, 129, 0.3)',
                                color: '#10b981'
                            }}
                        >
                            <p>Профиль успешно обновлён!</p>
                        </div>
                    )}

                    <form className="register-form" onSubmit={handleSubmit}>
                        <div className="form-section">
                            <h2 className="section-title">Основная информация</h2>

                            <div className="form-group">
                                <label className="form-label">
                                    <i className="fas fa-briefcase"></i> Роль
                                </label>
                                <div className="custom-select-wrapper">
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
                                                    className={`custom-select-option ${
                                                        formData.role === role ? 'active' : ''
                                                    }`}
                                                    onClick={() => handleRoleSelect(role)}
                                                >
                                                    {role}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">
                                    <i className="fas fa-signature"></i> ФИО
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
                                    <i className="fas fa-envelope"></i> Email*
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className={
                                        error && !/\S+@\S+\.\S+/.test(formData.email) ? 'error' : ''
                                    }
                                />
                                {error && !/\S+@\S+\.\S+/.test(formData.email) && (
                                    <div className="error-message">
                                        <i className="fas fa-exclamation-circle"></i>
                                        {error}
                                    </div>
                                )}
                            </div>

                        </div>

                        <div
                            className="form-actions"
                            style={{display: 'flex', gap: '12px', marginTop: '20px'}}
                        >
                            <button
                                type="submit"
                                className={`btn btn-primary ${
                                    submitting ? 'btn-loading' : ''
                                }`}
                                disabled={submitting}
                            >
                                {submitting ? '' : 'Сохранить'}
                            </button>
                            <button
                                type="button"
                                className="btn btn-danger"
                                onClick={() => navigate('/profile')}
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

export default EditProfilePage;