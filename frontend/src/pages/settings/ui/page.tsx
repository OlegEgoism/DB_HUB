import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import clsx from 'clsx';
import styles from './styles.module.scss';
import { useSession } from '@features/auth';
import { ROUTES } from '@shared/config';
import { CONNECTION_TAB_OPTIONS, DEFAULT_CONNECTION_TABS_VISIBILITY, connectionTabsSettingsModel, type ConnectionTabsVisibility, type ConnectionTabKey } from '@entities/settings/model';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { checkAuth } = useSession();
  const [visibility, setVisibility] = useState<ConnectionTabsVisibility>(DEFAULT_CONNECTION_TABS_VISIBILITY);

  useEffect(() => {
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

      const enabledTabs = Object.values(next).filter(Boolean).length;
      if (enabledTabs === 0) {
        return prev;
      }

      void connectionTabsSettingsModel.saveVisibility(next);
      return next;
    });
  };

  const handleReset = () => {
    setVisibility(DEFAULT_CONNECTION_TABS_VISIBILITY);
    void connectionTabsSettingsModel.saveVisibility(DEFAULT_CONNECTION_TABS_VISIBILITY);
  };

  return (
    <section className={clsx(styles.settings)}>
      <div className="container">
        <div className={clsx(styles.settings__section)}>
          <h1 className={clsx(styles.settings__title)}>Настройки</h1>
          <p className={clsx(styles.settings__description)}>
            Выберите, какие вкладки отображать на странице подключения.
          </p>

          <div className={clsx(styles.settings__card)}>
            {CONNECTION_TAB_OPTIONS.map((tab) => (
              <label key={tab.key} className={clsx(styles.settings__item)}>
                <input
                  type="checkbox"
                  checked={visibility[tab.key]}
                  onChange={() => handleToggle(tab.key)}
                />
                <span>{tab.label}</span>
              </label>
            ))}
          </div>

          <div className={clsx(styles.settings__actions)}>
            <button type="button" className={clsx(styles.settings__resetButton)} onClick={handleReset}>
              Сбросить по умолчанию
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
