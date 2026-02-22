import { useEffect, useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface ActiveQueryInfo {
  pid: number;
  username: string | null;
  application_name: string | null;
  client_addr: string | null;
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

        const token = localStorage.getItem('access_token');
        if (!token) {
          setError('Пользователь не авторизован');
          return;
        }

        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('size', size.toString());
        if (username && username.trim()) params.append('username', username.trim());
        if (minDurationMs !== null) params.append('min_duration_ms', String(minDurationMs));
        if (maxDurationMs !== null) params.append('max_duration_ms', String(maxDurationMs));

        const response = await fetch(
          `${API_BASE_URL}/api/v1/db_connections/${connectionId}/active_connections?${params.toString()}`,
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

        const data: ActiveQueriesResponse = await response.json();
        setActiveQueries(data.active_connections);
        setTotal(data.total_filtered_connections);
        setPages(data.pages);
        setHasNext(data.has_next);
        setHasPrev(data.has_prev);
      } catch (err) {
        console.error('Ошибка загрузки активных SQL-запросов:', err);
        setError(err instanceof Error ? err.message : 'Не удалось загрузить активные SQL-запросы');
      } finally {
        setLoading(false);
      }
    };

    fetchActiveQueries();
  }, [connectionId, page, size, username, minDurationMs, maxDurationMs, reloadTrigger]);

  return { activeQueries, loading, error, total, pages, hasNext, hasPrev };
}
