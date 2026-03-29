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

export function getConnectionTabsVisibility(): ConnectionTabsVisibility {
  if (typeof window === 'undefined') {
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
}

export function setConnectionTabsVisibility(visibility: ConnectionTabsVisibility) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(CONNECTION_TABS_STORAGE_KEY, JSON.stringify(visibility));
}

export function getVisibleConnectionTabs(): ConnectionTabKey[] {
  const visibility = getConnectionTabsVisibility();
  return CONNECTION_TAB_OPTIONS.filter((tab) => visibility[tab.key]).map((tab) => tab.key);
}
