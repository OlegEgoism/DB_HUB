// frontend/src/pages/agreements/ui/page.tsx

import clsx from 'clsx';
import { useAgreements } from '../lib/useAgreements';
import styles from './styles.module.scss';

export default function AgreementsPage() {
    const { agreements, loading, error } = useAgreements();

    // Фильтруем только активные соглашения
    const activeAgreements = agreements.filter(agreement => agreement.is_active);

    return (
        <section className={clsx(styles.agreements)}>
            <div className="container">
                <div className={clsx(styles.agreements__section)}>
                    <h1 className={clsx(styles.agreements__title)}>Соглашения</h1>

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

                    {!loading && !error && activeAgreements.length === 0 && (
                        <div className={clsx(styles.agreements__empty)}>
                            Активные соглашения не найдены
                        </div>
                    )}

                    {!loading && activeAgreements.length > 0 && (
                        <div className={clsx(styles.agreements__list)}>
                            {activeAgreements.map((agreement) => (
                                <div
                                    key={agreement.id}
                                    className={clsx(styles.agreements__item)}
                                >
                                    <div className={clsx(styles.agreements__header)}>
                                        <span className={clsx(styles.agreements__number)}>
                                            №{agreement.number}
                                        </span>
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
                </div>
            </div>
        </section>
    )
}