import { useEffect, useState } from 'react';
import { apiRequest } from '@shared/api/http';
import { toQueryString } from '@shared/lib/query';

export interface DBViewInfo {
  schema_name: string;
  view_name: string;
  owner: string;
  description: string | null;
  definition: string;
}

interface ViewsResponse {
  total?: number;
  total_views?: number;
  total_filtered_views?: number;
  total_materialized_views?: number;
  total_filtered_materialized_views?: number;
  page: number;
  size: number;
  pages?: number;
  has_next?: boolean;
  has_prev?: boolean;
  views?: DBViewInfo[];
  materialized_views?: DBViewInfo[];
}

function useBaseConnectionViews(
  connectionId: number,
  page: number,
  size: number,
  search: string | null,
  reloadTrigger: number,
  endpoint: 'views' | 'materialized_views',
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

        const query = toQueryString({ page, size, search: search?.trim() });
        const data = await apiRequest<ViewsResponse>(`/api/v1/db_connections/${connectionId}/${endpoint}?${query}`, {
          withAuth: true,
        });

        const resolvedViews = endpoint === 'materialized_views' ? data.materialized_views || [] : data.views || [];
        const resolvedTotal =
          endpoint === 'materialized_views'
            ? data.total_filtered_materialized_views ?? data.total_materialized_views ?? data.total ?? resolvedViews.length
            : data.total_filtered_views ?? data.total_views ?? data.total ?? resolvedViews.length;

        setViews(resolvedViews);
        setTotal(resolvedTotal);
        setPages(data.pages ?? 0);
        setHasNext(Boolean(data.has_next));
        setHasPrev(Boolean(data.has_prev));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить представления');
      } finally {
        setLoading(false);
      }
    };

    fetchViews();
  }, [connectionId, page, size, search, reloadTrigger, endpoint]);

  return { views, loading, error, total, pages, hasNext, hasPrev };
}

export function useConnectionViews(
  connectionId: number,
  page: number = 1,
  size: number = 20,
  search: string | null = null,
  reloadTrigger: number = 0,
) {
  return useBaseConnectionViews(connectionId, page, size, search, reloadTrigger, 'views');
}

export function useConnectionMaterializedViews(
  connectionId: number,
  page: number = 1,
  size: number = 20,
  search: string | null = null,
  reloadTrigger: number = 0,
) {
  return useBaseConnectionViews(connectionId, page, size, search, reloadTrigger, 'materialized_views');
}
