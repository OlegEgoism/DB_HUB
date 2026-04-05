import { apiRequest } from '@shared/api/http';
import type { TranslationKey } from '@shared/i18n';

export const CONNECTION_TAB_OPTIONS = [
  { key: 'metrics', labelKey: 'tabs.overview' },
  { key: 'users', labelKey: 'tabs.users' },
  { key: 'groups', labelKey: 'tabs.groups' },
  { key: 'schemas', labelKey: 'tabs.schemas' },
  { key: 'tables', labelKey: 'tabs.tables' },
  { key: 'views', labelKey: 'tabs.views' },
  { key: 'indexes', labelKey: 'tabs.indexes' },
  { key: 'functions', labelKey: 'tabs.functions' },
  { key: 'procedures', labelKey: 'tabs.procedures' },
  { key: 'active_sql', labelKey: 'tabs.transactions' },
  { key: 'monitoring', labelKey: 'tabs.monitoring' },
  { key: 'sql_query', labelKey: 'tabs.query' },
] as const satisfies ReadonlyArray<{ key: string; labelKey: TranslationKey }>;

export type ConnectionTabKey = (typeof CONNECTION_TAB_OPTIONS)[number]['key'];
export type ConnectionTabsVisibility = Record<ConnectionTabKey, boolean>;

interface ConnectionTabSettingsResponse {
  tabs_visibility: Partial<ConnectionTabsVisibility>;
}

const CONNECTION_TABS_LOCAL_CACHE_KEY = 'dbhub_connection_tabs_visibility_cache';

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

function readLocalCache(): ConnectionTabsVisibility | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(CONNECTION_TABS_LOCAL_CACHE_KEY);
    if (!raw) {
      return null;
    }

    return normalizeVisibility(JSON.parse(raw) as Partial<ConnectionTabsVisibility>);
  } catch {
    return null;
  }
}

function writeLocalCache(visibility: ConnectionTabsVisibility) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(CONNECTION_TABS_LOCAL_CACHE_KEY, JSON.stringify(visibility));
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
      const normalized = normalizeVisibility(response.tabs_visibility);
      writeLocalCache(normalized);
      return normalized;
    } catch {
      return readLocalCache() ?? DEFAULT_CONNECTION_TABS_VISIBILITY;
    }
  },

  async saveVisibility(visibility: ConnectionTabsVisibility): Promise<ConnectionTabsVisibility> {
    writeLocalCache(visibility);

    try {
      const response = await apiRequest<ConnectionTabSettingsResponse>('/api/v1/app_settings/connection-tabs', {
        method: 'PUT',
        withAuth: true,
        body: JSON.stringify({ tabs_visibility: visibility }),
      });

      const normalized = normalizeVisibility(response.tabs_visibility);
      writeLocalCache(normalized);
      return normalized;
    } catch {
      return visibility;
    }
  },
};
