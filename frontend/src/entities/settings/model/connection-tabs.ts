export const CONNECTION_TABS_STORAGE_KEY = 'dbhub_connection_tabs_visibility';

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

export const DEFAULT_CONNECTION_TABS_VISIBILITY: ConnectionTabsVisibility = CONNECTION_TAB_OPTIONS.reduce(
  (acc, tab) => {
    acc[tab.key] = true;
    return acc;
  },
  {} as ConnectionTabsVisibility,
);

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export const connectionTabsSettingsModel = {
  getVisibility(): ConnectionTabsVisibility {
    if (!canUseStorage()) {
      return DEFAULT_CONNECTION_TABS_VISIBILITY;
    }

    const raw = window.localStorage.getItem(CONNECTION_TABS_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_CONNECTION_TABS_VISIBILITY;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<ConnectionTabsVisibility>;
      return CONNECTION_TAB_OPTIONS.reduce((acc, tab) => {
        acc[tab.key] = parsed[tab.key] ?? true;
        return acc;
      }, {} as ConnectionTabsVisibility);
    } catch {
      return DEFAULT_CONNECTION_TABS_VISIBILITY;
    }
  },

  setVisibility(visibility: ConnectionTabsVisibility) {
    if (!canUseStorage()) {
      return;
    }

    window.localStorage.setItem(CONNECTION_TABS_STORAGE_KEY, JSON.stringify(visibility));
  },

  getVisibleTabs(): ConnectionTabKey[] {
    const visibility = this.getVisibility();
    return CONNECTION_TAB_OPTIONS.filter((tab) => visibility[tab.key]).map((tab) => tab.key);
  },
};
