import { useEffect, useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

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
  group_privileges: TableGroupPrivilege[];
}

interface TablesResponse {
  connection_id: number;
  connection_name: string;
  requested_groups: string[];
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

        const token = localStorage.getItem('access_token');
        if (!token) {
          setError('Пользователь не авторизован');
          return;
        }

        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('size', size.toString());
        if (search && search.trim()) {
          params.append('search', search.trim());
        }

        const response = await fetch(
          `${API_BASE_URL}/api/v1/db_connections/${connectionId}/tables/privileges_groups?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        );

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData?.detail || `Ошибка: ${response.status}`);
        }

        const data: TablesResponse = await response.json();
        setTables(data.table_privileges);
        setTotal(data.total_filtered_tables);
        setPages(data.pages);
        setHasNext(data.has_next);
        setHasPrev(data.has_prev);
      } catch (err) {
        console.error('Ошибка загрузки таблиц:', err);
        setError(err instanceof Error ? err.message : 'Не удалось загрузить таблицы');
      } finally {
        setLoading(false);
      }
    };

    fetchTables();
  }, [connectionId, page, size, search, reloadTrigger]);

  return { tables, loading, error, total, pages, hasNext, hasPrev };
}
