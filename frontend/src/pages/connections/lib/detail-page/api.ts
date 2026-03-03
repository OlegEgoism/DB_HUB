import { apiRequest } from '@shared/api/http';
import type { Connection, DatabaseMetrics } from '@pages/connections/model/detail-page-types';

export const getConnectionById = (id: string) => apiRequest<Connection>(`/api/v1/db_connections/${id}`, { withAuth: true });

export const getConnectionMetrics = (id: string) =>
  apiRequest<DatabaseMetrics>(`/api/v1/db_connections/${id}/metrics`, { withAuth: true });
