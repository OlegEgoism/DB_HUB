import { useEffect, useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface DBProcedureInfo {
  schema_name: string;
  procedure_name: string;
  description: string | null;
  definition: string;
}

interface ProceduresResponse {
  total?: number;
  connection_id: number;
  connection_name: string;
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
          `${API_BASE_URL}/api/v1/db_connections/${connectionId}/procedures?${params.toString()}`,
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

        const data: ProceduresResponse = await response.json();
        const resolvedProcedures = Array.isArray(data.procedures) ? data.procedures : [];
        const resolvedTotal = typeof data.total_filtered_procedures === 'number'
          ? data.total_filtered_procedures
          : typeof data.total_procedures === 'number'
            ? data.total_procedures
            : typeof data.total === 'number'
              ? data.total
              : resolvedProcedures.length;
        const resolvedPages = typeof data.pages === 'number' && data.pages > 0
          ? data.pages
          : Math.max(1, Math.ceil(resolvedTotal / size));

        setProcedures(resolvedProcedures);
        setTotal(resolvedTotal);
        setPages(resolvedPages);
        setHasNext(typeof data.has_next === 'boolean' ? data.has_next : page < resolvedPages);
        setHasPrev(typeof data.has_prev === 'boolean' ? data.has_prev : page > 1);
      } catch (err) {
        console.error('Ошибка загрузки процедур:', err);
        setError(err instanceof Error ? err.message : 'Не удалось загрузить процедуры');
      } finally {
        setLoading(false);
      }
    };

    fetchProcedures();
  }, [connectionId, page, size, search, reloadTrigger]);

  return { procedures, loading, error, total, pages, hasNext, hasPrev };
}
