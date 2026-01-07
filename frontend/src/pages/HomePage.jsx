// src/pages/HomePage.jsx
import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const HomePage = () => {
    const isAuthenticated = !!localStorage.getItem('access_token');

    if (!isAuthenticated) {
        return (
            <>
                <Header isAuthenticated={false}/>
                <main>
                    <section className="dashboard-section">
                        <h1 className="welcome-title">Зарегистрируйтесь или авторизуйтесь в DB HUB</h1>
                        <p className="profile-subtitle">
                            Современная платформа управления базами данных с централизованным доступом и администрированием.
                        </p>
                        <div className="features-grid">
                            <div className="feature-card">
                                <div className="feature-icon">
                                    <i className="fas fa-bolt"></i>
                                </div>
                                <h3 className="feature-title">Производительность</h3>
                                <p className="feature-description">
                                    Оптимизированные подключения к базам данных с минимальной задержкой.
                                </p>
                            </div>
                            <div className="feature-card">
                                <div className="feature-icon">
                                    <i className="fas fa-chart-line"></i>
                                </div>
                                <h3 className="feature-title">Мониторинг</h3>
                                <p className="feature-description">
                                    Детальная аналитика использования баз данных.
                                </p>
                            </div>
                            <div className="feature-card">
                                <div className="feature-icon">
                                    <i className="fas fa-users-cog"></i>
                                </div>
                                <h3 className="feature-title">Управление доступом</h3>
                                <p className="feature-description">
                                    Система ролевой модели для контроля доступа к базам данных.
                                </p>
                            </div>
                            <div className="feature-card">
                                <div className="feature-icon">
                                    <i className="fas fa-code"></i>
                                </div>
                                <h3 className="feature-title">API & Интеграции</h3>
                                <p className="feature-description">
                                    REST API для интеграции с другими системами.
                                </p>
                            </div>
                        </div>
                    </section>
                </main>
                <Footer/>
            </>
        );
    }

    return (
        <>
            <Header isAuthenticated={true}/>
            <main>
                <section className="connections-section">
                    <div className="section-header">
                        <div className="section-title-container">
                            <h2>Активные подключения</h2>
                            <div className="connections-count">0</div>
                        </div>
                        <div className="section-controls">
                            <div className="section-search-bar">
                                <i className="fas fa-search"></i>
                                <input type="text" placeholder="Поиск подключений..." disabled/>
                            </div>
                            <div className="btn btn-primary btn-large">
                                <button className="btn btn-primary" disabled>
                                    <i className="fas fa-plus"></i> Создать подключение
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="filters-container">
                        <div className="filter-tabs">
                            <button className="tab active" disabled>Все</button>
                            <button className="tab" disabled>Продакшн</button>
                            <button className="tab" disabled>Разработка</button>
                            <button className="tab" disabled>MySQL</button>
                            <button className="tab" disabled>Избранные</button>
                        </div>
                    </div>

                    <div className="connections-grid">
                        <p>Подключения к базам данных будут отображаться здесь после реализации.</p>
                    </div>
                </section>
            </main>
            <Footer/>
        </>
    );
};

export default HomePage;