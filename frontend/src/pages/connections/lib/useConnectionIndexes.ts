import { useEffect, useState } from 'react';
import { apiRequest } from '@shared/api/http';
import { toQueryString } from '@shared/lib/query';

export interface DBIndexInfo {
  schema_name: string;
  table_name: string;
  index_name: string;
  owner: string;
  index_type: string;
  description?: string | null;
  definition: string;
}

interface IndexesResponse {
  total?: number;
  total_indexes?: number;
  total_filtered_indexes?: number;
  page: number;
  size: number;
  pages?: number;
  has_next?: boolean;
  has_prev?: boolean;
  indexes: DBIndexInfo[];
}

export function useConnectionIndexes(
  connectionId: number,
  page: number = 1,
  size: number = 20,
  search: string | null = null,
  reloadTrigger: number = 0,
) {
  const [indexes, setIndexes] = useState<DBIndexInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  useEffect(() => {
    const fetchIndexes = async () => {
      try {
        setLoading(true);
        setError(null);

        const query = toQueryString({ page, size, search: search?.trim() });
        const data = await apiRequest<IndexesResponse>(`/api/v1/db_connections/${connectionId}/indexes?${query}`, {
          withAuth: true,
        });

        setIndexes(data.indexes || []);
        setTotal(data.total_filtered_indexes ?? data.total_indexes ?? data.total ?? 0);
        setPages(data.pages ?? 0);
        setHasNext(Boolean(data.has_next));
        setHasPrev(Boolean(data.has_prev));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить индексы');
      } finally {
        setLoading(false);
      }
    };

    fetchIndexes();
  }, [connectionId, page, size, search, reloadTrigger]);

  return { indexes, loading, error, total, pages, hasNext, hasPrev };
}
