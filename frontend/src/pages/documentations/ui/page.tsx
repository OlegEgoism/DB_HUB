import clsx from 'clsx';
import {useDocumentations} from '../lib/useDocumentations';
import styles from './styles.module.scss';

export default function DocumentationsPage() {
    const {documentations, loading, error} = useDocumentations();

    return (
        <section className={clsx(styles.documentations)}>
            <div className="container">
                <div className={clsx(styles.documentations__section)}>
                    <h1 className={clsx(styles.documentations__title)}>Документация</h1>

                    {loading && (
                        <div className={clsx(styles.documentations__loading)}>
                            Загрузка документации...
                        </div>
                    )}

                    {error && (
                        <div className={clsx(styles.documentations__error)}>
                            Ошибка загрузки: {error}
                        </div>
                    )}

                    {!loading && !error && (
                        <div className={clsx(styles.documentations__list)}>
                            {documentations
                                .map((documentation) => (
                                    <div
                                        key={documentation.id}
                                        className={clsx(styles.documentations__item)}
                                    >
                                        <div className={clsx(styles.documentations__header)}>
                                            <h2 className={clsx(styles.documentations__itemTitle)}>
                                                {documentation.title}
                                            </h2>
                                        </div>
                                        <div className={clsx(styles.documentations__content)}>
                                            {documentation.content}
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}

                    {!loading && !error && documentations.length === 0 && (
                        <div className={clsx(styles.documentations__empty)}>
                            Активная документация не найдена
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}