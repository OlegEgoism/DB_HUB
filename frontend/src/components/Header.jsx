// src/components/Header.jsx
import React from 'react';
import {Link, useNavigate} from 'react-router-dom';

const Header = ({isAuthenticated}) => {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    return (
        <header className="dashboard-header">
            <Link to="/" className="header-logo-link">
                <h1>
                    <i className="fas fa-database"></i> DB HUB
                </h1>
                <p>Платформа управления базами данных</p>
            </Link>

            {isAuthenticated ? (
                <div className="header-actions">
                    <Link to="/audit" className="btn btn-primary">
                        <i className="fas fa-clipboard-list"></i> Аудит
                    </Link>
                    <Link to="/settings" className="btn btn-primary">
                        <i className="fas fa-cog"></i> Настройки
                    </Link>
                    <Link to="/profile" className="btn btn-primary">
                        <i className="fas fa-user"></i> Профиль
                    </Link>
                    <button onClick={handleLogout} className="btn btn-danger">
                        <i className="fas fa-sign-out-alt"></i> Выход
                    </button>
                </div>
            ) : (
                <div className="header-actions">
                    <Link to="/register" className="btn btn-primary">
                        <i className="fas fa-user-plus"></i> Регистрация
                    </Link>
                    <Link to="/login" className="btn btn-primary">
                        <i className="fas fa-sign-in-alt"></i> Авторизоваться
                    </Link>
                </div>
            )}
        </header>
    );
};

export default Header;