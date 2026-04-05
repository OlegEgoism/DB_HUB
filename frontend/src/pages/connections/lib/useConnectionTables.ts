import { useEffect, useState } from 'react';
import { apiRequest } from '@shared/api/http';
import { toQueryString } from '@shared/lib/query';

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
  page: number;
  size: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
  table_privileges: TablePrivilegeInfo[];
}

export function useConnectionTables(
  connectionId: number,
  page: number = 1,
  size: number = 20,
  search: string | null = null,
  tableKind: 'regular' | 'temporary' | 'all' = 'regular',
  reloadTrigger: number = 0,
) {
  const [tables, setTables] = useState<TablePrivilegeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  useEffect(() => {
    const fetchTables = async () => {
      try {
        setLoading(true);
        setError(null);

        const query = toQueryString({ page, size, table_kind: tableKind, search: search?.trim() });
        const data = await apiRequest<TablesResponse>(
          `/api/v1/db_connections/${connectionId}/tables/privileges_groups?${query}`,
          { withAuth: true },
        );

        setTables(data.table_privileges || []);
        setTotal(data.total_filtered_tables ?? data.total_tables ?? 0);
        setPages(data.pages ?? 0);
        setHasNext(Boolean(data.has_next));
        setHasPrev(Boolean(data.has_prev));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить таблицы');
      } finally {
        setLoading(false);
      }
    };

    fetchTables();
  }, [connectionId, page, size, search, tableKind, reloadTrigger]);

  return { tables, loading, error, total, pages, hasNext, hasPrev };
}
