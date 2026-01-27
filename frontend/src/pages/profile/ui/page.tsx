// frontend/src/pages/profile/ui/page.tsx

import clsx from 'clsx';
import styles from './styles.module.scss';

export default function ProfilePage() {
    return (
        <section className={clsx(styles.profile)}>
            <div className="container">
                <div className={clsx(styles.profile__body)}>
                    <h1>Profile Page</h1>
                </div>
            </div>
        </section>
    )
};