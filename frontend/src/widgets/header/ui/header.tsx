// frontend/src/widgets/header/ui/header.tsx

import { NavLink } from 'react-router';
import { useState } from 'react';
import { ROUTES } from '@shared/config';
import { Logo } from '@shared/ui';
import { RegisterModal } from '@widgets/auth/ui/RegisterModal';
import styles from './header.module.scss';
import clsx from 'clsx';

export function Header() {
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

    const handleRegisterClick = () => {
        setIsRegisterModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsRegisterModalOpen(false);
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

                    {/* Кнопка регистрации */}
                    <button
                        className={clsx(styles.header__registerButton)}
                        onClick={handleRegisterClick}
                    >
                        Регистрация
                    </button>
                </div>
            </div>

            {/* Модальное окно регистрации */}
            {isRegisterModalOpen && (
                <RegisterModal onClose={handleCloseModal} />
            )}
        </header>
    );
}