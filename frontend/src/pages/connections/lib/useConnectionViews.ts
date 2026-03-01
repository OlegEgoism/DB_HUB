import { useEffect, useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface DBViewInfo {
  schema_name: string;
  view_name: string;
  description: string | null;
  definition: string;
}

interface ViewsResponse {
  total?: number;
  total_views?: number;
  total_filtered_views?: number;
  views?: DBViewInfo[];
}

interface MaterializedViewsResponse {
  total?: number;
  total_materialized_views?: number;
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

        const data: (ViewsResponse & MaterializedViewsResponse & { pages?: number; has_next?: boolean; has_prev?: boolean }) = await response.json();
        const resolvedViews = Array.isArray(data[dataKey]) ? data[dataKey] ?? [] : [];

        const resolvedTotal = typeof data[totalKey] === 'number'
          ? data[totalKey]
          : dataKey === 'views'
            ? typeof data.total_views === 'number'
              ? data.total_views
              : typeof data.total === 'number'
                ? data.total
                : resolvedViews.length
            : typeof data.total_materialized_views === 'number'
              ? data.total_materialized_views
              : typeof data.total === 'number'
                ? data.total
                : resolvedViews.length;

        const resolvedPages = typeof data.pages === 'number' && data.pages > 0
          ? data.pages
          : Math.max(1, Math.ceil(resolvedTotal / size));

        setViews(resolvedViews);
        setTotal(resolvedTotal);
        setPages(resolvedPages);
        setHasNext(typeof data.has_next === 'boolean' ? data.has_next : page < resolvedPages);
        setHasPrev(typeof data.has_prev === 'boolean' ? data.has_prev : page > 1);
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
