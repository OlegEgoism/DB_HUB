import clsx from 'clsx';
import type { CSSProperties } from 'react';
import styles from './styles.module.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faBolt,
    faChartLine,
    faUsers,
    faCode,
    faShieldAlt,
    faDatabase,
    faWandMagicSparkles,
    faGears,
} from '@fortawesome/free-solid-svg-icons';

const FEATURES = [
    {
        icon: faBolt,
        title: 'Быстрый старт',
        description: 'Подключайтесь к рабочим базам за минуты и экономьте время команды.',
    },
    {
        icon: faChartLine,
        title: 'Единый мониторинг',
        description: 'Следите за состоянием и нагрузкой без переключения между сервисами.',
    },
    {
        icon: faUsers,
        title: 'Контроль доступа',
        description: 'Гибкое управление ролями и пользователями для безопасной работы.',
    },
    {
        icon: faCode,
        title: 'Интеграции и API',
        description: 'Встраивайте DB HUB в ваши процессы и автоматизируйте рутину.',
    },
];

const STAGES = [
    { icon: faDatabase, title: 'Подключение', text: 'Добавьте источник данных и сохраните безопасные параметры доступа.' },
    { icon: faGears, title: 'Управление', text: 'Редактируйте структуры, пользователей и права в одном окне.' },
    { icon: faWandMagicSparkles, title: 'Аналитика', text: 'Получайте метрики и быстрее принимайте технические решения.' },
];

export default function HomePage() {
    return (
        <section className={styles.home}>
            <div className="container">
                <div className={styles.home__heroCard}>
                    <div className={styles.home__orbA} aria-hidden="true" />
                    <div className={styles.home__orbB} aria-hidden="true" />

                    <div className={styles.home__header}>
                        <span className={styles.home__badge}>Новый вариант страницы</span>
                        <h1 className={styles.home__title}>DB HUB — современный центр управления базами данных</h1>
                        <p className={styles.home__subtitle}>
                            Платформа объединяет подключение, мониторинг, аналитику и контроль доступа в одном
                            интерфейсе с плавными анимациями и акцентом на читаемость данных.
                        </p>
                    </div>

                    <div className={styles.home__metrics}>
                        <article className={styles.home__metricCard}>
                            <FontAwesomeIcon icon={faDatabase} />
                            <div>
                                <strong>Все подключения</strong>
                                <span>В одном рабочем пространстве</span>
                            </div>
                        </article>
                        <article className={styles.home__metricCard}>
                            <FontAwesomeIcon icon={faShieldAlt} />
                            <div>
                                <strong>Безопасный доступ</strong>
                                <span>Роли, права и аудит изменений</span>
                            </div>
                        </article>
                    </div>

                    <div className={clsx(styles.home__features)}>
                        {FEATURES.map((feature, index) => (
                            <article
                                key={feature.title}
                                className={styles.home__feature}
                                style={{ '--feature-delay': `${index * 90}ms` } as CSSProperties}
                            >
                                <div className={styles.home__featureIcon}>
                                    <FontAwesomeIcon icon={feature.icon} />
                                </div>
                                <h3 className={styles.home__featureTitle}>{feature.title}</h3>
                                <p className={styles.home__featureDescription}>{feature.description}</p>
                            </article>
                        ))}
                    </div>

                    <div className={styles.home__stageList}>
                        {STAGES.map((stage, index) => (
                            <article key={stage.title} className={styles.home__stage}>
                                <span className={styles.home__stageCounter}>0{index + 1}</span>
                                <FontAwesomeIcon icon={stage.icon} />
                                <div>
                                    <h4>{stage.title}</h4>
                                    <p>{stage.text}</p>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
