import { useEffect, useState } from 'react';
import { apiRequest } from '@shared/api/http';
import { toQueryString } from '@shared/lib/query';

export interface ActiveQueryInfo {
  pid: number;
  username: string | null;
  application_name: string | null;
  client_addr: string | null;
  client_hostname: string | null;
  client_port: number | null;
  backend_start: string;
  query_start: string | null;
  state_change: string | null;
  state: string | null;
  query: string;
  duration_ms: number | null;
}

interface ActiveQueriesResponse {
  total_active_connections: number;
  total_filtered_connections: number;
  page: number;
  size: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
  active_connections: ActiveQueryInfo[];
}

export function useConnectionActiveQueries(
  connectionId: number,
  page: number = 1,
  size: number = 20,
  username: string | null = null,
  state: string | null = null,
  minDurationMs: number | null = null,
  maxDurationMs: number | null = null,
  reloadTrigger: number = 0,
) {
  const [activeQueries, setActiveQueries] = useState<ActiveQueryInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  useEffect(() => {
    const fetchActiveQueries = async () => {
      try {
        setLoading(true);
        setError(null);

        const query = toQueryString({
          page,
          size,
          username: username?.trim(),
          state: state?.trim(),
          min_duration_ms: minDurationMs,
          max_duration_ms: maxDurationMs,
        });

        const data = await apiRequest<ActiveQueriesResponse>(
          `/api/v1/db_connections/${connectionId}/active_connections?${query}`,
          { withAuth: true },
        );

        setActiveQueries(data.active_connections || []);
        setTotal(data.total_filtered_connections ?? data.total_active_connections ?? 0);
        setPages(data.pages ?? 0);
        setHasNext(Boolean(data.has_next));
        setHasPrev(Boolean(data.has_prev));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить активные SQL-запросы');
      } finally {
        setLoading(false);
      }
    };

    fetchActiveQueries();
  }, [connectionId, page, size, username, state, minDurationMs, maxDurationMs, reloadTrigger]);

  return { activeQueries, loading, error, total, pages, hasNext, hasPrev };
}
