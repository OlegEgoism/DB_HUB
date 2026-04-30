import { useCallback } from 'react';
import { apiRequest } from '@shared/api/http';
import { useAsyncAction } from '@shared/lib/useAsyncAction';

export interface CreateConnectionData {
  name: string;
  description: string | null;
  database_type: string;
  environment: string;
  is_favorite: boolean;
  host: string;
  port: number;
  database_name: string;
  username: string;
  password: string;
  owner_id: number;
}

export function useCreateConnection() {
  const createConnectionAction = useCallback(
    (data: CreateConnectionData) =>
      apiRequest('/api/v1/db_connections', {
        method: 'POST',
        body: JSON.stringify(data),
        withAuth: true,
      }),
    [],
  );

  const { execute, loading, error, success } = useAsyncAction(createConnectionAction, {
    defaultErrorMessage: 'Failed to create connection',
  });

  return { createConnection: execute, loading, error, success };
}
