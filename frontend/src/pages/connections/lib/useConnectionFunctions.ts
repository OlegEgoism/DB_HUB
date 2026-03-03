import { useEffect, useState } from 'react';
import { apiRequest } from '@shared/api/http';
import { toQueryString } from '@shared/lib/query';

export interface DBFunctionInfo {
  schema_name: string;
  function_name: string;
  description: string | null;
  definition: string;
}

interface FunctionsResponse {
  total?: number;
  total_functions?: number;
  total_filtered_functions?: number;
  page: number;
  size: number;
  pages?: number;
  has_next?: boolean;
  has_prev?: boolean;
  functions: DBFunctionInfo[];
}

export function useConnectionFunctions(
  connectionId: number,
  page: number = 1,
  size: number = 20,
  search: string | null = null,
  reloadTrigger: number = 0,
) {
  const [functions, setFunctions] = useState<DBFunctionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  useEffect(() => {
    const fetchFunctions = async () => {
      try {
        setLoading(true);
        setError(null);

        const query = toQueryString({ page, size, search: search?.trim() });
        const data = await apiRequest<FunctionsResponse>(`/api/v1/db_connections/${connectionId}/functions?${query}`, {
          withAuth: true,
        });

        setFunctions(data.functions || []);
        setTotal(data.total_filtered_functions ?? data.total_functions ?? data.total ?? 0);
        setPages(data.pages ?? 0);
        setHasNext(Boolean(data.has_next));
        setHasPrev(Boolean(data.has_prev));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить функции');
      } finally {
        setLoading(false);
      }
    };

    fetchFunctions();
  }, [connectionId, page, size, search, reloadTrigger]);

  return { functions, loading, error, total, pages, hasNext, hasPrev };
}
