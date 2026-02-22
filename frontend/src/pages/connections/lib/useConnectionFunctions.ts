import { useEffect, useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface DBFunctionInfo {
  schema_name: string;
  function_name: string;
  description: string | null;
  definition: string;
}

interface FunctionsResponse {
  connection_id: number;
  connection_name: string;
  total_functions: number;
  total_filtered_functions: number;
  page: number;
  size: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
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
          `${API_BASE_URL}/api/v1/db_connections/${connectionId}/functions?${params.toString()}`,
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

        const data: FunctionsResponse = await response.json();
        setFunctions(data.functions);
        setTotal(data.total_filtered_functions);
        setPages(data.pages);
        setHasNext(data.has_next);
        setHasPrev(data.has_prev);
      } catch (err) {
        console.error('Ошибка загрузки функций:', err);
        setError(err instanceof Error ? err.message : 'Не удалось загрузить функции');
      } finally {
        setLoading(false);
      }
    };

    fetchFunctions();
  }, [connectionId, page, size, search, reloadTrigger]);

  return { functions, loading, error, total, pages, hasNext, hasPrev };
}
