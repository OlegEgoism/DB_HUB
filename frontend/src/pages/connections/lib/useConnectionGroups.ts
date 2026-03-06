import { useEffect, useState } from 'react';
import { apiRequest } from '@shared/api/http';
import { toQueryString } from '@shared/lib/query';

export interface DBGroup {
  oid: number;
  name: string;
  description: string | null;
  user_count?: number;
}

interface GroupsResponse {
  items: DBGroup[];
  total: number;
  page: number;
  size: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export function useConnectionGroups(
  connectionId: number,
  page: number = 1,
  size: number = 20,
  search: string | null = null,
  reloadTrigger: number = 0,
) {
  const [groups, setGroups] = useState<DBGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        setLoading(true);
        setError(null);

        const query = toQueryString({ page, size, search: search?.trim() });
        const data = await apiRequest<GroupsResponse>(`/api/v1/db_connections/${connectionId}/groups?${query}`, {
          withAuth: true,
        });

        setGroups(data.items);
        setTotal(data.total);
        setPages(data.pages);
        setHasNext(data.has_next);
        setHasPrev(data.has_prev);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить группы');
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, [connectionId, page, size, search, reloadTrigger]);

  return { groups, loading, error, total, pages, hasNext, hasPrev };
}
