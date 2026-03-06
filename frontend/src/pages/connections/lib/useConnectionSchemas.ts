import { useEffect, useState } from 'react';
import { apiRequest } from '@shared/api/http';
import { toQueryString } from '@shared/lib/query';

export interface SchemaRolePrivilege {
  role: string;
  usage: boolean;
  create: boolean;
}

export interface SchemaPrivilegeInfo {
  schema_name: string;
  owner: string;
  role_privileges: SchemaRolePrivilege[];
}

interface SchemasResponse {
  total_schemas?: number;
  total_filtered_schemas?: number;
  page: number;
  size: number;
  pages?: number;
  has_next?: boolean;
  has_prev?: boolean;
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

        const query = toQueryString({ page, size, search: search?.trim() });
        const data = await apiRequest<SchemasResponse>(
          `/api/v1/db_connections/${connectionId}/schemas/privileges_groups?${query}`,
          { withAuth: true },
        );

        setSchemas(data.schema_privileges || []);
        setTotal(data.total_filtered_schemas ?? data.total_schemas ?? 0);
        setPages(data.pages ?? 0);
        setHasNext(Boolean(data.has_next));
        setHasPrev(Boolean(data.has_prev));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить схемы');
      } finally {
        setLoading(false);
      }
    };

    fetchSchemas();
  }, [connectionId, page, size, search, reloadTrigger]);

  return { schemas, loading, error, total, pages, hasNext, hasPrev };
}
