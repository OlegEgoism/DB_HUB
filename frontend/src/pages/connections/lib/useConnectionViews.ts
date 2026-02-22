import { useEffect, useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface DBViewInfo {
  schema_name: string;
  view_name: string;
  description: string | null;
  definition: string;
}

interface ViewsResponse {
  total_filtered_views?: number;
  views?: DBViewInfo[];
}

interface MaterializedViewsResponse {
  total_filtered_materialized_views?: number;
  materialized_views?: DBViewInfo[];
}

function useViewsBase(
  endpoint: string,
  dataKey: 'views' | 'materialized_views',
  totalKey: 'total_filtered_views' | 'total_filtered_materialized_views',
  connectionId: number,
  page: number = 1,
  size: number = 20,
  search: string | null = null,
  reloadTrigger: number = 0,
) {
  const [views, setViews] = useState<DBViewInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  useEffect(() => {
    const fetchViews = async () => {
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
          `${API_BASE_URL}/api/v1/db_connections/${connectionId}/${endpoint}?${params.toString()}`,
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

        const data: (ViewsResponse & MaterializedViewsResponse & { pages: number; has_next: boolean; has_prev: boolean }) = await response.json();
        setViews(Array.isArray(data[dataKey]) ? data[dataKey] ?? [] : []);
        setTotal(typeof data[totalKey] === 'number' ? data[totalKey] ?? 0 : 0);
        setPages(data.pages);
        setHasNext(data.has_next);
        setHasPrev(data.has_prev);
      } catch (err) {
        console.error('Ошибка загрузки представлений:', err);
        setError(err instanceof Error ? err.message : 'Не удалось загрузить представления');
      } finally {
        setLoading(false);
      }
    };

    fetchViews();
  }, [connectionId, endpoint, page, size, search, reloadTrigger, dataKey, totalKey]);

  return { views, loading, error, total, pages, hasNext, hasPrev };
}

export function useConnectionViews(
  connectionId: number,
  page: number = 1,
  size: number = 20,
  search: string | null = null,
  reloadTrigger: number = 0,
) {
  return useViewsBase('views', 'views', 'total_filtered_views', connectionId, page, size, search, reloadTrigger);
}

export function useConnectionMaterializedViews(
  connectionId: number,
  page: number = 1,
  size: number = 20,
  search: string | null = null,
  reloadTrigger: number = 0,
) {
  return useViewsBase('views/materialized', 'materialized_views', 'total_filtered_materialized_views', connectionId, page, size, search, reloadTrigger);
}
