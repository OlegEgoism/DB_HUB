import { useEffect, useState } from 'react';

import { useI18n } from '@shared/i18n';
import { DB_CONNECTION_STATUS_EVENT } from '@shared/api/http';

import styles from './db-connection-alert.module.scss';

interface DbConnectionEventDetail {
  hasIssue: boolean;
  message?: string;
}

export function DbConnectionAlert() {
  const { t } = useI18n();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const onStatusChange = (event: Event) => {
      const detail = (event as CustomEvent<DbConnectionEventDetail>).detail;
      if (!detail?.hasIssue) {
        setMessage(null);
        return;
      }
      setMessage(detail.message || t('db.connection.inactive'));
    };

    window.addEventListener(DB_CONNECTION_STATUS_EVENT, onStatusChange as EventListener);

    return () => {
      window.removeEventListener(DB_CONNECTION_STATUS_EVENT, onStatusChange as EventListener);
    };
  }, [t]);

  if (!message) {
    return null;
  }

  return (
    <div className={styles.toast} role="alert" aria-live="assertive">
      {message}
    </div>
  );
}
