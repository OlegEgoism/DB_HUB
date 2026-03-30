import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import clsx from 'clsx';
import styles from './styles.module.scss';
import { useSession } from '@features/auth';
import { ROUTES } from '@shared/config';
import { CONNECTION_TAB_OPTIONS, DEFAULT_CONNECTION_TABS_VISIBILITY, connectionTabsSettingsModel, type ConnectionTabsVisibility, type ConnectionTabKey } from '@entities/settings/model';
import { useI18n } from '@shared/i18n';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { checkAuth } = useSession();
  const isInitializedRef = useRef(false);
  const [visibility, setVisibility] = useState<ConnectionTabsVisibility>(DEFAULT_CONNECTION_TABS_VISIBILITY);
  const { t } = useI18n();

  const tabLabelMap: Record<ConnectionTabKey, string> = {
    metrics: t('tabs.overview'),
    users: t('tabs.users'),
    groups: t('tabs.groups'),
    schemas: t('tabs.schemas'),
    tables: t('tabs.tables'),
    views: t('tabs.views'),
    indexes: t('tabs.indexes'),
    functions: t('tabs.functions'),
    procedures: t('tabs.procedures'),
    active_sql: t('tabs.transactions'),
    sql_query: t('tabs.query'),
  };

  useEffect(() => {
    if (isInitializedRef.current) {
      return;
    }

    isInitializedRef.current = true;

    if (!checkAuth()) {
      navigate(ROUTES.LOGIN);
      return;
    }

    const loadSettings = async () => {
      const nextVisibility = await connectionTabsSettingsModel.fetchVisibility();
      setVisibility(nextVisibility);
    };

    void loadSettings();
  }, [checkAuth, navigate]);

  const handleToggle = (tabKey: ConnectionTabKey) => {
    setVisibility((prev) => {
      const next = {
        ...prev,
        [tabKey]: !prev[tabKey],
      };

      void connectionTabsSettingsModel.saveVisibility(next).then((saved) => {
        setVisibility(saved);
      });
      return next;
    });
  };

  const handleReset = () => {
    setVisibility(DEFAULT_CONNECTION_TABS_VISIBILITY);
    void connectionTabsSettingsModel.saveVisibility(DEFAULT_CONNECTION_TABS_VISIBILITY).then((saved) => {
      setVisibility(saved);
    });
  };

  return (
    <section className={clsx(styles.settings)}>
      <div className="container">
        <div className={clsx(styles.settings__section)}>
          <h1 className={clsx(styles.settings__title)}>{t('settings.title')}</h1>
          <p className={clsx(styles.settings__description)}>
            {t('settings.description')}
          </p>

          <div className={clsx(styles.settings__card)}>
            {CONNECTION_TAB_OPTIONS.map((tab) => (
              <label key={tab.key} className={clsx(styles.settings__item)}>
                <input
                  type="checkbox"
                  checked={visibility[tab.key]}
                  onChange={() => handleToggle(tab.key)}
                />
                <span>{tabLabelMap[tab.key] ?? tab.label}</span>
              </label>
            ))}
          </div>

          <div className={clsx(styles.settings__actions)}>
            <button type="button" className={clsx(styles.settings__resetButton)} onClick={handleReset}>
              {t('settings.reset')}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
