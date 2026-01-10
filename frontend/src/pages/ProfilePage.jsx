// src/pages/ProfilePage.jsx
import React, {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

const ProfilePage = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUserProfile = async () => {
            const token = localStorage.getItem('access_token');
            const storedUser = localStorage.getItem('user');

            if (!token || !storedUser) {
                navigate('/login');
                return;
            }

            try {
                const parsedUser = JSON.parse(storedUser);
                const userId = parsedUser.id;

                // Используем прямой URL для надёжности (или настройте прокси в vite.config.js)
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
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchUserProfile();
    }, [navigate]);

    const isAuthenticated = !!localStorage.getItem('access_token');

    if (loading) {
        return (
            <>
                <Header isAuthenticated={isAuthenticated}/>
                <section className="register-section">
                    <div className="register-container">
                        <p>Загрузка профиля...</p>
                    </div>
                </section>
                <Footer/>
            </>
        );
    }

    if (error) {
        return (
            <>
                <Header isAuthenticated={isAuthenticated}/>
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
            <Header isAuthenticated={isAuthenticated}/>
            <section className="register-section">
                <div className="register-container">
                    <div className="register-header">
                        <h1>Профиль пользователя</h1>
                    </div>

                    <div className="register-form">
                        <div className="form-section">
                            <h2 className="section-title">Основная информация</h2>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">
                                        <i className="fas fa-user"></i> Логин
                                    </label>
                                    <div className="profile-value">{user.username}</div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">
                                        <i className="fas fa-briefcase"></i> Роль
                                    </label>
                                    <div className="profile-value">{user.role}</div>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">
                                    <i className="fas fa-signature"></i> ФИО
                                </label>
                                <div className="profile-value">{user.fio || 'Не указано'}</div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">
                                    <i className="fas fa-envelope"></i> Email
                                </label>
                                <div className="profile-value">{user.email}</div>
                            </div>
                        </div>

                        <div className="form-section">
                            <h2 className="section-title">Дополнительная информация</h2>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">
                                        <i className="fas fa-toggle-on"></i> Активен
                                    </label>
                                    <div className="profile-value">{user.is_active ? 'Да' : 'Нет'}</div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">
                                        <i className="fas fa-crown"></i> Суперпользователь
                                    </label>
                                    <div className="profile-value">{user.is_superuser ? 'Да' : 'Нет'}</div>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">
                                        <i className="fas fa-calendar-plus"></i> Дата регистрации
                                    </label>
                                    <div className="profile-value">
                                        {new Date(user.created_at).toLocaleString('ru-RU')}
                                    </div>
                                </div>

                                {user.last_login && (
                                    <div className="form-group">
                                        <label className="form-label">
                                            <i className="fas fa-clock"></i> Последний вход
                                        </label>
                                        <div className="profile-value">
                                            {new Date(user.last_login).toLocaleString('ru-RU')}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Кнопка редактирования — только для активных пользователей */}
                        {user.is_active && (
                            <div  >
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={() => navigate('/profile/edit')}
                                >
                                    <i className="fas fa-edit"></i> Редактировать
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </section>
            <Footer/>
        </>
    );
};

export default ProfilePage;