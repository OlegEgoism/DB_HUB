import { NavLink } from 'react-router';
import { useState } from 'react';
import { ROUTES } from '@shared/config';
import { Logo } from '@shared/ui';
import { RegisterModal } from '@widgets/auth/ui/RegisterModal';
import { LoginModal } from '@widgets/auth/ui/LoginModal';
import { useSession } from '@features/auth';
import styles from './header.module.scss';
import clsx from 'clsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSignOutAlt } from '@fortawesome/free-solid-svg-icons';

export function Header() {
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const { logout, checkAuth, getUser } = useSession();

  const isAuthenticated = checkAuth();
  const user = getUser();

  const handleLoginSuccess = () => {
    setIsLoginModalOpen(false);
    window.location.reload();
  };

  const handleLogout = () => {
    logout();
    window.location.reload();
  };

  return (
    <header className={clsx(styles.header)}>
      <div className="container">
        <div className={clsx(styles.header__body)}>
          <div className={clsx(styles.header__holder)}>
            <Logo />
          </div>

          <div className={clsx(styles.header__actions)}>
            {!isAuthenticated ? (
              <>
                <button className={clsx(styles.header__loginButton)} onClick={() => setIsLoginModalOpen(true)}>
                  Авторизация
                </button>
                <button className={clsx(styles.header__registerButton)} onClick={() => setIsRegisterModalOpen(true)}>
                  Регистрация
                </button>
              </>
            ) : (
              <>
                <div className={clsx(styles.header__navMenu)}>
                  <NavLink to={ROUTES.CONNECTIONS} className={clsx(styles.header__profileButton)}>
                    Подключения
                  </NavLink>
                  {user?.is_superuser && (
                    <NavLink to={ROUTES.USERS} className={clsx(styles.header__profileButton)}>
                      Пользователи
                    </NavLink>
                  )}
                  <NavLink to={ROUTES.PROFILE} className={clsx(styles.header__profileButton)}>
                    Профиль
                  </NavLink>
                </div>
                <div className={clsx(styles.header__userMenu)}>
                  <div className={clsx(styles.header__userInfo)}>
                    <span className={clsx(styles.header__username)}>{user?.username || 'User'}</span>
                  </div>
                  <button className={clsx(styles.header__logoutButton)} onClick={handleLogout}>
                    <FontAwesomeIcon icon={faSignOutAlt} />
                    Выход
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {isRegisterModalOpen && <RegisterModal onClose={() => setIsRegisterModalOpen(false)} />}
      {isLoginModalOpen && <LoginModal onClose={() => setIsLoginModalOpen(false)} onLoginSuccess={handleLoginSuccess} />}
    </header>
  );
}
