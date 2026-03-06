import { useEffect, useState } from 'react';
import { apiRequest } from '@shared/api/http';
import { toQueryString } from '@shared/lib/query';

export interface DBUser {
  oid: number;
  name: string;
  description: string | null;
  email: string | null;
}

export interface UsersResponse {
  items: DBUser[];
  total: number;
  page: number;
  size: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export function useConnectionUsers(
  connectionId: number,
  page: number = 1,
  size: number = 20,
  search: string | null = null,
  reloadTrigger: number = 0,
) {
  const [users, setUsers] = useState<DBUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError(null);

        const query = toQueryString({ page, size, search: search?.trim() });
        const data = await apiRequest<UsersResponse>(`/api/v1/db_connections/${connectionId}/users?${query}`, {
          withAuth: true,
        });

        setUsers(data.items);
        setTotal(data.total);
        setPages(data.pages);
        setHasNext(data.has_next);
        setHasPrev(data.has_prev);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить пользователей');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [connectionId, page, size, search, reloadTrigger]);

  return { users, loading, error, total, pages, hasNext, hasPrev };
}
