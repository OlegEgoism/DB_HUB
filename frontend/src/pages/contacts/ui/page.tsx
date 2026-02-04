// frontend/src/pages/agreements/ui/page.tsx

import clsx from 'clsx';
import styles from './styles.module.scss';

export default function ContactsPage() {
    return (
        <section className={clsx(styles.contacts)}>
            <div className="container">
                <div className={clsx(styles.contacts__body)}>
                    <h1>Contacts Page</h1>
                </div>
            </div>
        </section>
    )
}