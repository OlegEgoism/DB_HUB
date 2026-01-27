// frontend/src/widgets/footer/ui/header.tsx

import { NavLink } from 'react-router';
import { ROUTES } from '@shared/config';
import { Logo } from '@shared/ui';
import styles from './header.module.scss';
import clsx from 'clsx';


export function Header() {
    return (
        <header className={clsx(styles.header)}>
            <div className="container">
                <div className={clsx(styles.header__body)}>
                    <div className={clsx(styles.header__holder)}>
                        <Logo />
                        <p className={clsx(styles.header__subtitle)}>Платформа для управления базами данных</p>
                    </div>
                    {/* Навигация пока такого вида */}
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
                </div>
            </div>
        </header>
    );
}