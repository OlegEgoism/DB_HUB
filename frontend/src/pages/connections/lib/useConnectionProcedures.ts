import { useEffect, useState } from 'react';
import { apiRequest } from '@shared/api/http';
import { toQueryString } from '@shared/lib/query';

export interface DBProcedureInfo {
  schema_name: string;
  procedure_name: string;
  description: string | null;
  definition: string;
}

interface ProceduresResponse {
  total?: number;
  total_procedures?: number;
  total_filtered_procedures?: number;
  page: number;
  size: number;
  pages?: number;
  has_next?: boolean;
  has_prev?: boolean;
  procedures: DBProcedureInfo[];
}

export function useConnectionProcedures(
  connectionId: number,
  page: number = 1,
  size: number = 20,
  search: string | null = null,
  reloadTrigger: number = 0,
) {
  const [procedures, setProcedures] = useState<DBProcedureInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  useEffect(() => {
    const fetchProcedures = async () => {
      try {
        setLoading(true);
        setError(null);

        const query = toQueryString({ page, size, search: search?.trim() });
        const data = await apiRequest<ProceduresResponse>(`/api/v1/db_connections/${connectionId}/procedures?${query}`, {
          withAuth: true,
        });

        setProcedures(data.procedures || []);
        setTotal(data.total_filtered_procedures ?? data.total_procedures ?? data.total ?? 0);
        setPages(data.pages ?? 0);
        setHasNext(Boolean(data.has_next));
        setHasPrev(Boolean(data.has_prev));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить процедуры');
      } finally {
        setLoading(false);
      }
    };

    fetchProcedures();
  }, [connectionId, page, size, search, reloadTrigger]);

  return { procedures, loading, error, total, pages, hasNext, hasPrev };
}
