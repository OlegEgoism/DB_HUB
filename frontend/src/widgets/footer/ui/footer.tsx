// frontend/src/widgets/footer/ui/footer.tsx

import { NavLink } from 'react-router';
import { ROUTES } from '@shared/config';
import { Logo } from '@shared/ui';
import styles from './footer.module.scss';
import clsx from 'clsx';

export function Footer() {
    return (
        <footer className={clsx(styles.footer)}>
            <div className={styles.footer__body}>
                <div className={styles.footer__holder}>
                    <Logo />
                </div>

                <nav className={styles.footer__nav}>
                    <ul className={styles.footer__navList}>
                        <li>
                            <NavLink to={ROUTES.DOCUMENTATIONS} className={styles.footer__navLink}>
                                Документация
                            </NavLink>
                        </li>
                        <li>
                            <NavLink to={ROUTES.CONTACTS} className={styles.footer__navLink}>
                                Контакты
                            </NavLink>
                        </li>
                    </ul>
                </nav>
            </div>
        </footer>
    );
}