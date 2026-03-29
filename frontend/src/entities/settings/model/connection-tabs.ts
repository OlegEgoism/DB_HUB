import { apiRequest } from '@shared/api/http';

export const CONNECTION_TAB_OPTIONS = [
  { key: 'metrics', label: 'Информация' },
  { key: 'users', label: 'Пользователи' },
  { key: 'groups', label: 'Группы' },
  { key: 'schemas', label: 'Схемы' },
  { key: 'tables', label: 'Таблицы' },
  { key: 'views', label: 'Представления' },
  { key: 'indexes', label: 'Индексы' },
  { key: 'functions', label: 'Функции' },
  { key: 'procedures', label: 'Процедуры' },
  { key: 'active_sql', label: 'Транзакции' },
  { key: 'sql_query', label: 'SQL' },
] as const;

export type ConnectionTabKey = (typeof CONNECTION_TAB_OPTIONS)[number]['key'];
export type ConnectionTabsVisibility = Record<ConnectionTabKey, boolean>;

interface ConnectionTabSettingsResponse {
  tabs_visibility: Partial<ConnectionTabsVisibility>;
}

export const DEFAULT_CONNECTION_TABS_VISIBILITY: ConnectionTabsVisibility = CONNECTION_TAB_OPTIONS.reduce(
  (acc, tab) => {
    acc[tab.key] = true;
    return acc;
  },
  {} as ConnectionTabsVisibility,
);

function normalizeVisibility(partial?: Partial<ConnectionTabsVisibility>): ConnectionTabsVisibility {
  return CONNECTION_TAB_OPTIONS.reduce((acc, tab) => {
    acc[tab.key] = partial?.[tab.key] ?? true;
    return acc;
  }, {} as ConnectionTabsVisibility);
}

export const connectionTabsSettingsModel = {
  getVisibleTabs(visibility: ConnectionTabsVisibility): ConnectionTabKey[] {
    return CONNECTION_TAB_OPTIONS.filter((tab) => visibility[tab.key]).map((tab) => tab.key);
  },

  async fetchVisibility(): Promise<ConnectionTabsVisibility> {
    try {
      const response = await apiRequest<ConnectionTabSettingsResponse>('/api/v1/app_settings/connection-tabs', {
        withAuth: true,
      });
      return normalizeVisibility(response.tabs_visibility);
    } catch {
      return DEFAULT_CONNECTION_TABS_VISIBILITY;
    }
  },

  async saveVisibility(visibility: ConnectionTabsVisibility): Promise<ConnectionTabsVisibility> {
    const response = await apiRequest<ConnectionTabSettingsResponse>('/api/v1/app_settings/connection-tabs', {
      method: 'PUT',
      withAuth: true,
      body: JSON.stringify({ tabs_visibility: visibility }),
    });

    return normalizeVisibility(response.tabs_visibility);
  },
};
