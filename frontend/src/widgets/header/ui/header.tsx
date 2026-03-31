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
import { useI18n } from '@shared/i18n';

export function Header() {
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const { logout, checkAuth, getUser } = useSession();
  const { t } = useI18n();

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
                  {t('header.login')}
                </button>
                <button className={clsx(styles.header__registerButton)} onClick={() => setIsRegisterModalOpen(true)}>
                  {t('header.register')}
                </button>
              </>
            ) : (
              <>
                <div className={clsx(styles.header__userMenu)}>
                <NavLink to={ROUTES.CONNECTIONS} className={clsx(styles.header__profileButton)}>
                  {t('header.connections')}
                </NavLink>
                {user?.is_superuser && (
                  <NavLink to={ROUTES.USERS} className={clsx(styles.header__profileButton)}>
                    {t('header.users')}
                  </NavLink>
                )}
                <NavLink to={ROUTES.PROFILE} className={clsx(styles.header__profileButton)}>
                  {t('header.profile')}
                </NavLink>
                <NavLink to={ROUTES.SETTINGS} className={clsx(styles.header__profileButton)}>
                  {t('header.settings')}
                </NavLink>
                </div>
                <div className={clsx(styles.header__userMenu)}>
                  <div className={clsx(styles.header__userInfo)}>
                    <span className={clsx(styles.header__username)}>{user?.username || 'User'}</span>
                  </div>
                  <button className={clsx(styles.header__logoutButton)} onClick={handleLogout}>
                    <FontAwesomeIcon icon={faSignOutAlt} />
                    {t('header.logout')}
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
