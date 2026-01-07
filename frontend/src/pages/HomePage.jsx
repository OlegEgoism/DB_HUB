// src/pages/HomePage.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const HomePage = () => {
  const navigate = useNavigate();

  // Проверяем авторизацию через access_token в localStorage
  const isAuthenticated = !!localStorage.getItem('access_token');
  const user = localStorage.getItem('user');
  const userInfo = user ? JSON.parse(user) : null;

  // === Если НЕ авторизован — показываем ТОЛЬКО приветствие и кнопки ===
  if (!isAuthenticated) {
    return (
      <div className="homepage-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Header — упрощённый */}
        <header className="homepage-header">
          <div className="header-logo">
            <div className="logo-icon">📊</div>
            <div className="logo-text">
              <h1>DB HUB</h1>
              <p>Платформа для управления базами данных</p>
            </div>
          </div>
          <div className="header-actions">
            <Link to="/register" className="btn btn-outline">
              <i className="fas fa-user-plus"></i> Регистрация
            </Link>
            <Link to="/login" className="btn btn-outline">
              <i className="fas fa-sign-in-alt"></i> Войти
            </Link>
          </div>
        </header>

        {/* Только приветственный блок */}
        <main className="homepage-main" style={{ flex: 1 }}>
          <div className="welcome-section">
            <div className="welcome-icon">📊</div>
            <h1>Добро пожаловать в DB HUB</h1>
            <p>
              Современная платформа для управления базами данных с централизованным доступом,
              мониторингом и администрированием. Упрощайте работу с различными СУБД через единый интерфейс.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="cta-buttons">
            <Link to="/register" className="btn btn-outline">
              <i className="fas fa-user-plus"></i> Регистрация
            </Link>
            <Link to="/login" className="btn btn-outline">
              <i className="fas fa-sign-in-alt"></i> Войти
            </Link>
          </div>
        </main>

        {/* Footer */}
        <footer className="homepage-footer">
          <div className="footer-content">
            <span>2025 DB HUB v2.1</span>
            <div className="footer-links">
              <button type="button" className="footer-link-button" onClick={() => alert('Раздел в разработке')}>
                <i className="fas fa-shield-alt"></i> Безопасность
              </button>
              <button type="button" className="footer-link-button" onClick={() => alert('Раздел в разработке')}>
                <i className="fas fa-question-circle"></i> Помощь
              </button>
              <button type="button" className="footer-link-button" onClick={() => alert('Раздел в разработке')}>
                <i className="fas fa-book"></i> Документация
              </button>
              <button type="button" className="footer-link-button" onClick={() => alert('Раздел в разработке')}>
                <i className="fas fa-envelope"></i> Контакты
              </button>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // === Если авторизован — показываем полную страницу ===
  return (
      <div className="homepage-container">
        {/* Header */}
        <header className="dashboard-header">
          <div className="header-content">
            <Link to="/" style={{textDecoration: 'none', color: 'inherit', cursor: 'pointer'}}>
              <h1>
                <i className="fas fa-database" style={{color: 'var(--primary)'}}></i> DB HUB
              </h1>
              <p>Платформа для управления базами данных</p>
            </Link>
          </div>
          <div className="header-actions">
            {/* Можно добавить ссылки на аудит, настройки и т.д. */}
                        <Link to="/audit" className="btn btn-ghost"><i className="fas fa-clipboard-list"></i> Аудит</Link>
          <Link to="/settings" className="btn btn-ghost"><i className="fas fa-cog"></i> Настройки системы</Link>
          <Link to="/settings" className="btn btn-ghost"><i className="fas fa-cog"></i> Профиль</Link>
            <button
            className="btn btn-danger"
            onClick={() => {
              localStorage.removeItem('access_token');
              localStorage.removeItem('user');
              navigate('/login');
            }}
          >
            <i className="fas fa-sign-out-alt"></i> Выход
          </button>
        </div>
      </header>



      {/* Основной контент — например, список подключений */}
      <main className="homepage-main">
        <div className="welcome-section">
          <h1>Добро пожаловать, {userInfo.fio || userInfo.username}!</h1>
          <p>Вы вошли как: <strong>{userInfo.role}</strong></p>
        </div>

        {/* Заглушка для будущего контента */}
        <div className="connections-section">
          <h2>Ваши подключения к базам данных</h2>
          <p>Этот раздел будет реализован позже.</p>
        </div>
      </main>

      {/* Footer */}
      <footer className="dashboard-footer">
        <div className="footer-content">
          <div className="footer-left">
            <div className="copyright">
              <p>2025 DB HUB v2.1</p>
            </div>
            <div className="footer-links">
              <button type="button" className="footer-link-button" onClick={() => alert('Раздел в разработке')}>
                <i className="fas fa-shield-alt"></i> Безопасность
              </button>
              <button type="button" className="footer-link-button" onClick={() => alert('Раздел в разработке')}>
                <i className="fas fa-question-circle"></i> Помощь
              </button>
              <button type="button" className="footer-link-button" onClick={() => alert('Раздел в разработке')}>
                <i className="fas fa-book"></i> Документация
              </button>
              <button type="button" className="footer-link-button" onClick={() => alert('Раздел в разработке')}>
                <i className="fas fa-envelope"></i> Контакты
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;