import clsx from 'clsx';
import styles from './styles.module.scss';

export default function HomePage(){
    return (
        <section className={clsx(styles.home)}>
            <div className="container">
                <div className={clsx(styles.home__body)}>
                    <h1>Home Page</h1>
                </div>
            </div>
        </section>
    )
}