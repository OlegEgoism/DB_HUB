// frontend/src/widgets/footer/ui/footer.tsx

import styles from './footer.module.scss';
import clsx from 'clsx';

export function Footer() {
    return (
        <footer className={clsx(styles.footer)}>
            <div className="container">
                <div className={clsx(styles.footer__body)} />
            </div>
        </footer>
    );
}
