import { useEffect, useState } from 'react';
import { apiRequest } from '@shared/api/http';
import { toQueryString } from '@shared/lib/query';

export interface ViewGroupPrivilege {
  role: string;
  create: boolean;
  usage: boolean;
}

export interface DBViewInfo {
  schema_name: string;
  view_name: string;
  owner: string;
  description: string | null;
  definition: string;
}

export interface ViewPrivilegeInfo {
  schema_name: string;
  view_name: string;
  owner: string;
  description: string | null;
  role_privileges: ViewGroupPrivilege[];
}

interface ViewsResponse {
  total?: number;
  total_views?: number;
  total_filtered_views?: number;
  total_materialized_views?: number;
  total_filtered_materialized_views?: number;
  page: number;
  size: number;
  pages?: number;
  has_next?: boolean;
  has_prev?: boolean;
  views?: DBViewInfo[];
  materialized_views?: DBViewInfo[];
}

interface ViewsPrivilegesResponse {
  total_views?: number;
  total_filtered_views?: number;
  total_materialized_views?: number;
  total_filtered_materialized_views?: number;
  page: number;
  size: number;
  pages?: number;
  has_next?: boolean;
  has_prev?: boolean;
  view_privileges?: ViewPrivilegeInfo[];
}

function useBaseConnectionViews(
  connectionId: number,
  page: number,
  size: number,
  search: string | null,
  reloadTrigger: number,
  endpoint: 'views' | 'views/materialized',
) {
  const [views, setViews] = useState<DBViewInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  useEffect(() => {
    const fetchViews = async () => {
      try {
        setLoading(true);
        setError(null);

        const query = toQueryString({ page, size, search: search?.trim() });
        const data = await apiRequest<ViewsResponse>(`/api/v1/db_connections/${connectionId}/${endpoint}?${query}`, {
          withAuth: true,
        });

        const resolvedViews = endpoint === 'views/materialized' ? data.materialized_views || [] : data.views || [];
        const resolvedTotal =
          endpoint === 'views/materialized'
            ? data.total_filtered_materialized_views ?? data.total_materialized_views ?? data.total ?? resolvedViews.length
            : data.total_filtered_views ?? data.total_views ?? data.total ?? resolvedViews.length;

        setViews(resolvedViews);
        setTotal(resolvedTotal);
        setPages(data.pages ?? 0);
        setHasNext(Boolean(data.has_next));
        setHasPrev(Boolean(data.has_prev));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить представления');
      } finally {
        setLoading(false);
      }
    };

    fetchViews();
  }, [connectionId, page, size, search, reloadTrigger, endpoint]);

  return { views, loading, error, total, pages, hasNext, hasPrev };
}

function useBaseConnectionViewsPrivileges(
  connectionId: number,
  page: number,
  size: number,
  search: string | null,
  reloadTrigger: number,
  endpoint: 'views/privileges_groups' | 'views/materialized/privileges_groups',
) {
  const [viewPrivileges, setViewPrivileges] = useState<ViewPrivilegeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  useEffect(() => {
    const fetchViewPrivileges = async () => {
      try {
        setLoading(true);
        setError(null);

        const query = toQueryString({ page, size, search: search?.trim() });
        const data = await apiRequest<ViewsPrivilegesResponse>(
          `/api/v1/db_connections/${connectionId}/${endpoint}?${query}`,
          {
            withAuth: true,
          },
        );

        const resolvedTotal =
          endpoint === 'views/materialized/privileges_groups'
            ? data.total_filtered_materialized_views ?? data.total_materialized_views ?? data.view_privileges?.length ?? 0
            : data.total_filtered_views ?? data.total_views ?? data.view_privileges?.length ?? 0;

        setViewPrivileges(data.view_privileges || []);
        setTotal(resolvedTotal);
        setPages(data.pages ?? 0);
        setHasNext(Boolean(data.has_next));
        setHasPrev(Boolean(data.has_prev));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить права представлений');
      } finally {
        setLoading(false);
      }
    };

    fetchViewPrivileges();
  }, [connectionId, page, size, search, reloadTrigger, endpoint]);

  return { viewPrivileges, loading, error, total, pages, hasNext, hasPrev };
}

export function useConnectionViews(
  connectionId: number,
  page: number = 1,
  size: number = 20,
  search: string | null = null,
  reloadTrigger: number = 0,
) {
  return useBaseConnectionViews(connectionId, page, size, search, reloadTrigger, 'views');
}

export function useConnectionMaterializedViews(
  connectionId: number,
  page: number = 1,
  size: number = 20,
  search: string | null = null,
  reloadTrigger: number = 0,
) {
  return useBaseConnectionViews(connectionId, page, size, search, reloadTrigger, 'views/materialized');
}

export function useConnectionViewsPrivileges(
  connectionId: number,
  page: number = 1,
  size: number = 20,
  search: string | null = null,
  reloadTrigger: number = 0,
) {
  return useBaseConnectionViewsPrivileges(connectionId, page, size, search, reloadTrigger, 'views/privileges_groups');
}

export function useConnectionMaterializedViewsPrivileges(
  connectionId: number,
  page: number = 1,
  size: number = 20,
  search: string | null = null,
  reloadTrigger: number = 0,
) {
  return useBaseConnectionViewsPrivileges(
    connectionId,
    page,
    size,
    search,
    reloadTrigger,
    'views/materialized/privileges_groups',
  );
}
