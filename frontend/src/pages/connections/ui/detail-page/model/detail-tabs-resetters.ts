import type { TabType } from '@pages/connections/model/detail-page-types';

export interface DetailTabResetters {
  users: () => void;
  groups: () => void;
  schemas: () => void;
  tables: () => void;
  views: () => void;
  indexes: () => void;
  functions: () => void;
  procedures: () => void;
  active_sql: () => void;
  sql_query: () => void;
}

export function createTabResetMap(resetters: DetailTabResetters) {
  const resetMap: Partial<Record<TabType, () => void>> = {
    users: resetters.users,
    groups: resetters.groups,
    schemas: resetters.schemas,
    tables: resetters.tables,
    views: resetters.views,
    indexes: resetters.indexes,
    functions: resetters.functions,
    procedures: resetters.procedures,
    active_sql: resetters.active_sql,
    sql_query: resetters.sql_query,
  };

  return resetMap;
}