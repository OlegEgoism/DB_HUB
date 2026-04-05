import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import clsx from 'clsx';
import styles from './styles.module.scss';
import { useSession } from '@features/auth';
import { ROUTES } from '@shared/config';
import { CONNECTION_TAB_OPTIONS, DEFAULT_CONNECTION_TABS_VISIBILITY, connectionTabsSettingsModel, type ConnectionTabsVisibility, type ConnectionTabKey } from '@entities/settings/model';
import { useI18n, type Language } from '@shared/i18n';
import { apiRequest } from '@shared/api/http';

type ActiveSession = {
  session_id: number | null;
  user_id: number;
  username: string;
  fio: string | null;
  role: string;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
  last_seen_at: string;
  ip_address: string | null;
  user_agent: string | null;
  active_sessions: number;
};

export default function SettingsPage() {
  const navigate = useNavigate();
  const { checkAuth, getUser } = useSession();
  const isInitializedRef = useRef(false);
  const [visibility, setVisibility] = useState<ConnectionTabsVisibility>(DEFAULT_CONNECTION_TABS_VISIBILITY);
  const [isSaving, setIsSaving] = useState(false);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [revokingSessionId, setRevokingSessionId] = useState<number | null>(null);
  const { language, setLanguage, t } = useI18n();
  const currentUser = getUser();
  const canManageSessions = currentUser?.role === 'Администратор БД' && currentUser?.is_active && currentUser?.is_superuser;

  const formatRoleLabel = (role: string) => {
    const roleMap: Record<string, string> = {
      'Пользователь': t('roles.user'),
      'Аналитик': t('roles.analyst'),
      'Разработчик': t('roles.developer'),
      'Тестировщик': t('roles.tester'),
      'Администратор БД': t('roles.admin'),
    };

    return roleMap[role] ?? role;
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
      if (canManageSessions) {
        setSessionsLoading(true);
        try {
          const sessions = await apiRequest<ActiveSession[]>('/api/v1/app_auth/sessions/active', { withAuth: true });
          setActiveSessions(sessions);
        } finally {
          setSessionsLoading(false);
        }
      }
    };

    void loadSettings();
  }, [canManageSessions, checkAuth, language, navigate]);

  const handleToggle = (tabKey: ConnectionTabKey) => {
    setVisibility((prev) => {
      return {
        ...prev,
        [tabKey]: !prev[tabKey],
      };
    });
  };

  const handleReset = () => {
    setVisibility(DEFAULT_CONNECTION_TABS_VISIBILITY);
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);

    try {
      const savedVisibility = await connectionTabsSettingsModel.saveVisibility(visibility);
      setVisibility(savedVisibility);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevokeSession = async (userId: number) => {
    setRevokingSessionId(userId);
    try {
      await apiRequest('/api/v1/app_auth/sessions/users/' + userId + '/revoke', {
        method: 'POST',
        withAuth: true,
      });
      setActiveSessions((prev) => prev.map((session) => (
        session.user_id === userId ? { ...session, active_sessions: 0 } : session
      )));
    } finally {
      setRevokingSessionId(null);
    }
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
                <span>{t(tab.labelKey)}</span>
              </label>
            ))}
          </div>

          <div className={clsx(styles.settings__language)}>
            <label htmlFor="language" className={clsx(styles.settings__label)}>
              {t('settings.language')}
            </label>
            <select
              id="language"
              value={language}
              onChange={(event) => setLanguage(event.target.value as Language)}
              className={clsx(styles.settings__select)}
            >
              <option value="ru">{t('lang.ru')}</option>
              <option value="en">{t('lang.en')}</option>
            </select>
          </div>

          <div className={clsx(styles.settings__actions)}>
            <button type="button" className={clsx(styles.settings__resetButton)} onClick={handleReset}>
              {t('settings.reset')}
            </button>
            <button type="button" className={clsx(styles.settings__saveButton)} onClick={handleSaveSettings} disabled={isSaving}>
              {isSaving ? t('settings.saving') : t('settings.save')}
            </button>
          </div>

          {canManageSessions && (
            <div className={clsx(styles.settings__sessions)}>
              <h2 className={clsx(styles.settings__subtitle)}>{t('settings.sessions.title')}</h2>
              <p className={clsx(styles.settings__description)}>{t('settings.sessions.description')}</p>
              {sessionsLoading ? (
                <p className={clsx(styles.settings__empty)}>{t('settings.sessions.loading')}</p>
              ) : activeSessions.length === 0 ? (
                <p className={clsx(styles.settings__empty)}>{t('settings.sessions.empty')}</p>
              ) : (
                <div className={clsx(styles.settings__sessionsTable)}>
                  <div className={clsx(styles.settings__sessionHeadRow)}>
                    <span>{t('users.login')}</span>
                    <span>{t('users.role')}</span>
                    <span>{t('users.superuser')}</span>
                    <span>{t('settings.sessions.count')}</span>
                    <span>{t('users.actions')}</span>
                  </div>
                  {activeSessions.map((session) => (
                    <div key={session.user_id} className={clsx(styles.settings__sessionRow)}>
                      <span className={clsx(styles.settings__sessionValueStrong)}>{session.username}</span>
                      <span>{formatRoleLabel(session.role)}</span>
                      <span>{session.is_superuser ? t('yes') : t('no')}</span>
                      <span>{session.active_sessions}</span>
                      <button
                        type="button"
                        className={clsx(styles.settings__sessionLogoutButton)}
                        onClick={() => handleRevokeSession(session.user_id)}
                        disabled={revokingSessionId === session.user_id || session.active_sessions === 0}
                      >
                        {revokingSessionId === session.user_id ? t('settings.saving') : t('header.logout')}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
