// frontend/src/pages/agreements/ui/page.tsx

import clsx from 'clsx';
import styles from './styles.module.scss';

export default function DocumentationsPage() {
    return (
        <section className={clsx(styles.documentations)}>
            <div className="container">
                <div className={clsx(styles.documentations__body)}>
                    <h1>Documentations Page</h1>
                </div>
            </div>
        </section>
    )
}