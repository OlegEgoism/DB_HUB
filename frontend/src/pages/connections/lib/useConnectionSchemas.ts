import { useEffect, useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface SchemaRolePrivilege {
  role: string;
  create: boolean;
  usage: boolean;
}

export interface SchemaPrivilegeInfo {
  schema_name: string;
  owner: string;
  description: string | null;
  role_privileges: SchemaRolePrivilege[];
}

interface SchemasResponse {
  connection_id: number;
  connection_name: string;
  total_schemas: number;
  total_filtered_schemas: number;
  page: number;
  size: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
  schema_privileges: SchemaPrivilegeInfo[];
}

export function useConnectionSchemas(
  connectionId: number,
  page: number = 1,
  size: number = 20,
  search: string | null = null,
  reloadTrigger: number = 0,
) {
  const [schemas, setSchemas] = useState<SchemaPrivilegeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  useEffect(() => {
    const fetchSchemas = async () => {
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
          `${API_BASE_URL}/api/v1/db_connections/${connectionId}/schemas/privileges_groups?${params.toString()}`,
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

        const data: SchemasResponse = await response.json();
        setSchemas(data.schema_privileges);
        setTotal(data.total_filtered_schemas);
        setPages(data.pages);
        setHasNext(data.has_next);
        setHasPrev(data.has_prev);
      } catch (err) {
        console.error('Ошибка загрузки схем:', err);
        setError(err instanceof Error ? err.message : 'Не удалось загрузить схемы');
      } finally {
        setLoading(false);
      }
    };

    fetchSchemas();
  }, [connectionId, page, size, search, reloadTrigger]);

  return { schemas, loading, error, total, pages, hasNext, hasPrev };
}
