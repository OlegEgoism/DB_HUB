import clsx from 'clsx';
import styles from './styles.module.scss';

export default function ConnectionsPage() {
    return (
        <section className={clsx(styles.connections)}>
            <div className="container">
                <div className={clsx(styles.connections__body)}>
                    <h1>Connections Page</h1>
                </div>
            </div>
        </section>
    )
}