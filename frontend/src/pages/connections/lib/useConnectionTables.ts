import { useMemo } from 'react';
import { usePaginatedConnectionResource } from './usePaginatedConnectionResource';

export interface TableGroupPrivilege {
  group: string;
  select: boolean;
  insert: boolean;
  update: boolean;
  delete: boolean;
  truncate: boolean;
}

export interface TablePrivilegeInfo {
  schema_name: string;
  table_name: string;
  owner: string;
  description: string | null;
  size_bytes: number;
  size_pretty: string;
  group_privileges: TableGroupPrivilege[];
}

interface TablesResponse {
  total_tables: number;
  total_filtered_tables: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
  table_privileges: TablePrivilegeInfo[];
}

const selectTableItems = (response: TablesResponse) => response.table_privileges || [];
const selectTableTotal = (response: TablesResponse) => response.total_filtered_tables ?? response.total_tables ?? 0;

export function useConnectionTables(
  connectionId: number,
  page: number = 1,
  size: number = 20,
  search: string | null = null,
  tableKind: 'regular' | 'temporary' | 'all' = 'regular',
  reloadTrigger: number = 0,
) {
  const queryParams = useMemo(() => ({ table_kind: tableKind }), [tableKind]);

  const { items: tables, loading, error, total, pages, hasNext, hasPrev } = usePaginatedConnectionResource<
    TablesResponse,
    TablePrivilegeInfo
  >({
    connectionId,
    page,
    size,
    search,
    reloadTrigger,
    endpoint: 'tables/privileges_groups',
    queryParams,
    selectItems: selectTableItems,
    selectTotal: selectTableTotal,
    errorMessage: 'Не удалось загрузить таблицы',
  });

  return { tables, loading, error, total, pages, hasNext, hasPrev };
}
