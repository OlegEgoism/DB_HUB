import { useCallback } from 'react';
import { usePaginatedConnectionResource } from './usePaginatedConnectionResource';

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
  const selectItems = useCallback(
    (response: ViewsResponse) => (endpoint === 'views/materialized' ? response.materialized_views || [] : response.views || []),
    [endpoint],
  );

  const selectTotal = useCallback(
    (response: ViewsResponse, items: DBViewInfo[]) =>
      endpoint === 'views/materialized'
        ? response.total_filtered_materialized_views ?? response.total_materialized_views ?? response.total ?? items.length
        : response.total_filtered_views ?? response.total_views ?? response.total ?? items.length,
    [endpoint],
  );

  const { items: views, loading, error, total, pages, hasNext, hasPrev } = usePaginatedConnectionResource<
    ViewsResponse,
    DBViewInfo
  >({
    connectionId,
    page,
    size,
    search,
    reloadTrigger,
    endpoint,
    selectItems,
    selectTotal,
    errorMessage: 'Не удалось загрузить представления',
  });

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
  const selectItems = useCallback((response: ViewsPrivilegesResponse) => response.view_privileges || [], []);

  const selectTotal = useCallback(
    (response: ViewsPrivilegesResponse, items: ViewPrivilegeInfo[]) =>
      endpoint === 'views/materialized/privileges_groups'
        ? response.total_filtered_materialized_views ?? response.total_materialized_views ?? items.length
        : response.total_filtered_views ?? response.total_views ?? items.length,
    [endpoint],
  );

  const { items: viewPrivileges, loading, error, total, pages, hasNext, hasPrev } = usePaginatedConnectionResource<
    ViewsPrivilegesResponse,
    ViewPrivilegeInfo
  >({
    connectionId,
    page,
    size,
    search,
    reloadTrigger,
    endpoint,
    selectItems,
    selectTotal,
    errorMessage: 'Не удалось загрузить права представлений',
  });

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
