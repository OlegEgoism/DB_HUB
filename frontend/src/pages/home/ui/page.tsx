import clsx from 'clsx';
import styles from './styles.module.scss';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
    faBolt,
    faChartLine,
    faUsers,
    faCode,
} from '@fortawesome/free-solid-svg-icons';

export default function HomePage() {
    return (
        <section className={clsx(styles.home)}>
            <div className="container">
                <div className={clsx(styles.home__section)}>
                    <div className={clsx(styles.home__header)}>
                        <div className={clsx(styles.home__logo)}>

                            <div className={clsx(styles.home__logoText)}>
                                <h1 className={clsx(styles.home__title)}>Добро пожаловать в DB HUB</h1>
                                <p className={clsx(styles.home__subtitle)}>
                                    Платформа объединяет в едином интерфейсе все необходимые инструменты для работы с базами данных, без использования сторонних утилит.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className={clsx(styles.home__features)}>
                        <div className={clsx(styles.home__feature)}>
                            <div className={clsx(styles.home__featureIcon)}>
                                <FontAwesomeIcon icon={faBolt}/>
                            </div>
                            <h3 className={clsx(styles.home__featureTitle)}>Производительность</h3>
                            <p className={clsx(styles.home__featureDescription)}>
                                Минимальная задержка подключения.
                            </p>
                        </div>

                        <div className={clsx(styles.home__feature)}>
                            <div className={clsx(styles.home__featureIcon)}>
                                <FontAwesomeIcon icon={faChartLine}/>
                            </div>
                            <h3 className={clsx(styles.home__featureTitle)}>Мониторинг</h3>
                            <p className={clsx(styles.home__featureDescription)}>
                                Детальная аналитика.
                            </p>
                        </div>

                        <div className={clsx(styles.home__feature)}>
                            <div className={clsx(styles.home__featureIcon)}>
                                <FontAwesomeIcon icon={faUsers}/>
                            </div>
                            <h3 className={clsx(styles.home__featureTitle)}>Управление доступом</h3>
                            <p className={clsx(styles.home__featureDescription)}>
                                Система ролевой модели и доступа.
                            </p>
                        </div>

                        <div className={clsx(styles.home__feature)}>
                            <div className={clsx(styles.home__featureIcon)}>
                                <FontAwesomeIcon icon={faCode}/>
                            </div>
                            <h3 className={clsx(styles.home__featureTitle)}>API</h3>
                            <p className={clsx(styles.home__featureDescription)}>
                                Интеграции с другими системами.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}