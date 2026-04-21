import { useEffect, useState } from 'react';
import { apiRequest } from '@shared/api/http';
import { toQueryString } from '@shared/lib/query';

interface PaginationResponse {
  pages?: number;
  has_next?: boolean;
  has_prev?: boolean;
}

interface UsePaginatedConnectionResourceOptions<TResponse extends PaginationResponse, TItem> {
  connectionId: number;
  page?: number;
  size?: number;
  search?: string | null;
  reloadTrigger?: number;
  endpoint: string;
  queryParams?: Record<string, string | number | null | undefined>;
  selectItems: (response: TResponse) => TItem[];
  selectTotal: (response: TResponse, items: TItem[]) => number;
  errorMessage: string;
}

export interface PaginatedResourceResult<TItem> {
  items: TItem[];
  loading: boolean;
  error: string | null;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export function usePaginatedConnectionResource<TResponse extends PaginationResponse, TItem>({
  connectionId,
  page = 1,
  size = 20,
  search = null,
  reloadTrigger = 0,
  endpoint,
  queryParams,
  selectItems,
  selectTotal,
  errorMessage,
}: UsePaginatedConnectionResourceOptions<TResponse, TItem>): PaginatedResourceResult<TItem> {
  const [items, setItems] = useState<TItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const query = toQueryString({ page, size, search: search?.trim(), ...queryParams });
        const data = await apiRequest<TResponse>(`/api/v1/db_connections/${connectionId}/${endpoint}?${query}`, {
          withAuth: true,
        });

        const resolvedItems = selectItems(data);
        setItems(resolvedItems);
        setTotal(selectTotal(data, resolvedItems));
        setPages(data.pages ?? 0);
        setHasNext(Boolean(data.has_next));
        setHasPrev(Boolean(data.has_prev));
      } catch (err) {
        setError(err instanceof Error ? err.message : errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [connectionId, endpoint, page, size, search, reloadTrigger, queryParams, selectItems, selectTotal, errorMessage]);

  return { items, loading, error, total, pages, hasNext, hasPrev };
}
