// frontend/src/pages/agreements/ui/page.tsx

import clsx from 'clsx';
import styles from './styles.module.scss';

export default function AgreementsPage() {
    return (
        <section className={clsx(styles.agreements)}>
            <div className="container">
                <div className={clsx(styles.agreements__body)}>
                    <h1>Agreements Page</h1>
                </div>
            </div>
        </section>
    )
}