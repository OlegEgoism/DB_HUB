// frontend/src/widgets/footer/ui/footer.tsx

import {NavLink} from 'react-router';
import {ROUTES} from '@shared/config';
import styles from './footer.module.scss';
import clsx from 'clsx';
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
    faBook,
    faTasks,

} from "@fortawesome/free-solid-svg-icons";

export function Footer() {
    return (
        <footer className={clsx(styles.footer)}>
            <div className="container">
                <div className={clsx(styles.footer__body)}>
                    <nav className={styles.footer__nav}>
                        <ul className={styles.footer__navList}>
                            <li className={styles.footer__navItem}>
                                <NavLink
                                    to={ROUTES.DOCUMENTATIONS}
                                    className={({isActive}) =>
                                        clsx(styles.footer__navLink, isActive && styles.footer__navLink_active)
                                    }
                                >
                                    <FontAwesomeIcon icon={faBook}/>
                                    Документация
                                </NavLink>
                            </li>
                            <li className={styles.footer__navItem}>
                                <NavLink
                                    to={ROUTES.AGREEMENTS}
                                    className={({isActive}) =>
                                        clsx(styles.footer__navLink, isActive && styles.footer__navLink_active)
                                    }
                                >
                                    <FontAwesomeIcon icon={faTasks}/>
                                    Соглашения
                                </NavLink>
                            </li>
                        </ul>
                    </nav>
                </div>
            </div>
        </footer>
    );
}