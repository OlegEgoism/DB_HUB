// frontend/src/widgets/header/ui/header.tsx
import { NavLink } from 'react-router';
import { useState, useEffect } from 'react';
import { ROUTES } from '@shared/config';
import { Logo } from '@shared/ui';
import { RegisterModal } from '@widgets/auth/ui/RegisterModal';
import { LoginModal } from '@widgets/auth/ui/LoginModal';
import { useLogin } from '@pages/auth/lib/useLogin';
import styles from './header.module.scss';
import clsx from 'clsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';

export function Header() {
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const { logout } = useLogin();

  // Проверяем авторизацию при загрузке
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user');

    if (token && userData) {
      setIsAuthenticated(true);
      setUser(JSON.parse(userData));
    } else {
      setIsAuthenticated(false);
      setUser(null);
    }
  }, []);

  const handleRegisterClick = () => {
    setIsRegisterModalOpen(true);
  };

  const handleLoginClick = () => {
    setIsLoginModalOpen(true);
  };

  const handleCloseRegisterModal = () => {
    setIsRegisterModalOpen(false);
  };

  const handleCloseLoginModal = () => {
    setIsLoginModalOpen(false);
  };

  const handleLoginSuccess = () => {
    setIsLoginModalOpen(false);
    const token = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user');

    if (token && userData) {
      setIsAuthenticated(true);
      setUser(JSON.parse(userData));
    }
    // Перезагружаем страницу для обновления состояния
    window.location.reload();
  };

  const handleLogout = () => {
    logout();
    setIsAuthenticated(false);
    setUser(null);
    window.location.reload();
  };

  return (
    <header className={clsx(styles.header)}>
      <div className="container">
        <div className={clsx(styles.header__body)}>
          <div className={clsx(styles.header__holder)}>
            <Logo/>
            <p className={clsx(styles.header__subtitle)}>Платформа для управления базами данных</p>
          </div>

          {/* Навигация */}
          <nav className="nav">
            <ul className={clsx(styles.nav__list)}>
              <li className="nav__item">
                <NavLink className="nav__link" to={ROUTES.HOME}>Home</NavLink>
              </li>
              <li className="nav__item">
                <NavLink className="nav__link" to={ROUTES.CONNECTIONS}>Connections</NavLink>
              </li>
              <li className="nav__item">
                <NavLink className="nav__link" to={ROUTES.PROFILE}>Profile</NavLink>
              </li>
            </ul>
          </nav>

          {/* Кнопки авторизации/регистрации или профиля */}
          <div className={clsx(styles.header__actions)}>
            {!isAuthenticated ? (
              <>
                <button
                  className={clsx(styles.header__loginButton)}
                  onClick={handleLoginClick}
                >
                  Авторизация
                </button>
                <button
                  className={clsx(styles.header__registerButton)}
                  onClick={handleRegisterClick}
                >
                  Регистрация
                </button>
              </>
            ) : (
              <div className={clsx(styles.header__userMenu)}>
                <div className={clsx(styles.header__userInfo)}>
                  <FontAwesomeIcon icon={faUser} className={clsx(styles.header__userIcon)} />
                  <span className={clsx(styles.header__username)}>{user?.username || 'User'}</span>
                  <span className={clsx(styles.header__userRole)}>{user?.role}</span>
                </div>
                <button
                  className={clsx(styles.header__logoutButton)}
                  onClick={handleLogout}
                >
                  <FontAwesomeIcon icon={faSignOutAlt} />
                  Выход
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Модальные окна */}
      {isRegisterModalOpen && (
        <RegisterModal onClose={handleCloseRegisterModal} />
      )}

      {isLoginModalOpen && (
        <LoginModal
          onClose={handleCloseLoginModal}
          onLoginSuccess={handleLoginSuccess}
        />
      )}
    </header>
  );
}