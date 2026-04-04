// frontend/src/pages/home/ui/page.tsx
import clsx from 'clsx';
import styles from './styles.module.scss';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
    faBolt,
    faChartLine,
    faUsers,
    faCode,
} from '@fortawesome/free-solid-svg-icons';
import { useI18n } from '@shared/i18n';

export default function HomePage() {
    const { t } = useI18n();
    return (
        <section className={clsx(styles.home)}>
            <div className="container">
                <div className={clsx(styles.home__section)}>
                    <div className={clsx(styles.home__header)}>
                        <div className={clsx(styles.home__logo)}>

                            <div className={clsx(styles.home__logoText)}>
                                <h1 className={clsx(styles.home__title)}>{t('home.title')}</h1>
                                <p className={clsx(styles.home__subtitle)}>
                                    {t('home.subtitle')}
                                </p>
                                <div className={clsx(styles.home__projectInfo)}>
                                    <h2 className={clsx(styles.home__projectTitle)}>{t('home.project.title')}</h2>
                                    <p className={clsx(styles.home__projectDescription)}>{t('home.project.description')}</p>
                                    <ol className={clsx(styles.home__projectSteps)}>
                                        <li>{t('home.project.step1')}</li>
                                        <li>{t('home.project.step2')}</li>
                                    </ol>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={clsx(styles.home__features)}>
                        <div className={clsx(styles.home__feature)}>
                            <div className={clsx(styles.home__featureIcon)}>
                                <FontAwesomeIcon icon={faBolt}/>
                            </div>
                            <h3 className={clsx(styles.home__featureTitle)}>{t('home.performance.title')}</h3>
                            <p className={clsx(styles.home__featureDescription)}>
                                {t('home.performance.desc')}
                            </p>
                        </div>

                        <div className={clsx(styles.home__feature)}>
                            <div className={clsx(styles.home__featureIcon)}>
                                <FontAwesomeIcon icon={faChartLine}/>
                            </div>
                            <h3 className={clsx(styles.home__featureTitle)}>{t('home.monitoring.title')}</h3>
                            <p className={clsx(styles.home__featureDescription)}>
                                {t('home.monitoring.desc')}
                            </p>
                        </div>

                        <div className={clsx(styles.home__feature)}>
                            <div className={clsx(styles.home__featureIcon)}>
                                <FontAwesomeIcon icon={faUsers}/>
                            </div>
                            <h3 className={clsx(styles.home__featureTitle)}>{t('home.access.title')}</h3>
                            <p className={clsx(styles.home__featureDescription)}>
                                {t('home.access.desc')}
                            </p>
                        </div>

                        <div className={clsx(styles.home__feature)}>
                            <div className={clsx(styles.home__featureIcon)}>
                                <FontAwesomeIcon icon={faCode}/>
                            </div>
                            <h3 className={clsx(styles.home__featureTitle)}>{t('home.api.title')}</h3>
                            <p className={clsx(styles.home__featureDescription)}>
                                {t('home.api.desc')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
