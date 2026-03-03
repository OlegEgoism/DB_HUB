import { apiRequest } from '@shared/api/http';
import { toQueryString } from '@shared/lib/query';
import type { ConnectionsResponse, ConnectionsTab } from '@pages/connections/model/page-types';

interface FetchConnectionsParams {
  page: number;
  size: number;
  search?: string;
  activeTab: ConnectionsTab;
}

function mapTabToFilters(activeTab: ConnectionsTab): Record<string, string | boolean | undefined> {
  switch (activeTab) {
    case 'Избранные':
      return { is_favorite: true };
    case 'Продакшн':
      return { environment: 'production' };
    case 'Разработка':
      return { environment: 'development' };
    case 'Тестирование':
      return { environment: 'testing' };
    case 'Аналитика':
      return { environment: 'analytics' };
    default:
      return {};
  }
}

export function fetchConnections(params: FetchConnectionsParams) {
  const query = toQueryString({
    page: params.page,
    size: params.size,
    search: params.search?.trim(),
    ...mapTabToFilters(params.activeTab),
  });

  return apiRequest<ConnectionsResponse>(`/api/v1/db_connections?${query}`, { withAuth: true });
}

export function removeConnection(connectionId: number) {
  return apiRequest<void>(`/api/v1/db_connections/${connectionId}`, {
    method: 'DELETE',
    withAuth: true,
  });
}

export function patchConnectionFavorite(connectionId: number, isFavorite: boolean) {
  return apiRequest(`/api/v1/db_connections/${connectionId}/favorite`, {
    method: 'PATCH',
    body: JSON.stringify({ is_favorite: isFavorite }),
    withAuth: true,
  });
}
