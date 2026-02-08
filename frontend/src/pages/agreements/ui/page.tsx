// frontend/src/pages/agreements/ui/page.tsx

import clsx from 'clsx';
import {useAgreements} from '../lib/useAgreements';
import styles from './styles.module.scss';

export default function AgreementsPage() {
    const {agreements, loading, error} = useAgreements();

    // Отладка: выводим все данные в консоль
    if (!loading && agreements.length > 0) {
        console.log('Все соглашения:', agreements);
        console.log('Активные соглашения:', agreements.filter(a => a.is_active));
    }

    return (
        <section className={clsx(styles.agreements)}>
            <div className="container">
                <div className={clsx(styles.agreements__section)}>
                    <p className={clsx(styles.agreements__title)}>Соглашения</p>

                    {loading && (
                        <div className={clsx(styles.agreements__loading)}>
                            Загрузка соглашений...
                        </div>
                    )}

                    {error && (
                        <div className={clsx(styles.agreements__error)}>
                            Ошибка загрузки: {error}
                        </div>
                    )}

                    {!loading && !error && (
                        <div className={clsx(styles.agreements__list)}>
                            {agreements
                                .map((agreement) => (
                                    <div
                                        key={agreement.id}
                                        className={clsx(styles.agreements__item)}
                                    >
                                        <div className={clsx(styles.agreements__header)}>
                                            <h2 className={clsx(styles.agreements__itemTitle)}>
                                                {agreement.title}
                                            </h2>
                                        </div>
                                        <div className={clsx(styles.agreements__content)}>
                                            {agreement.content}
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}

                    {!loading && !error && agreements.length === 0 && (
                        <div className={clsx(styles.agreements__empty)}>
                            Активные соглашения не найдены
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}