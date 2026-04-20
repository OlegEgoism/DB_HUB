
import type { TabType } from '@pages/connections/model/detail-page-types';
import type { ConnectionTabsVisibility } from '@entities/settings/model';

export interface TabConfigItem {
  key: TabType;
  labelKey: string;
}

export const DETAIL_TABS: TabConfigItem[] = [
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
  { key: 'sql_query', labelKey: 'tabs.sql_query' },
];

export function isTabVisible(
  visibleTabs: ConnectionTabsVisibility,
  tab: TabType,
): boolean {
  return Boolean(visibleTabs[tab]);
}