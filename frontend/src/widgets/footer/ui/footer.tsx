// frontend/src/widgets/footer/ui/footer.tsx

import styles from './footer.module.scss';
import clsx from 'clsx';
import {NavLink} from "react-router";
import {ROUTES} from "@shared/config";

export function Footer() {
    return (
        <footer className={clsx(styles.footer)}>
            <div className="container">
                <div className={clsx(styles.footer__body)}>
                    <NavLink className={clsx(styles.logo, 'link')} to={ROUTES.HOME}>
                        <strong className={styles.logo__title}>DB HUB</strong>
                    </NavLink>
                </div>
            </div>
        </footer>
    );
}
