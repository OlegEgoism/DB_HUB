import { useCallback } from 'react';
import { apiRequest } from '@shared/api/http';
import { useAsyncAction } from '@shared/lib/useAsyncAction';

export interface EditConnectionData {
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

export function useEditConnection(connectionId: number) {
  const updateConnectionAction = useCallback(
    (data: Partial<EditConnectionData>) =>
      apiRequest(`/api/v1/db_connections/${connectionId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
        withAuth: true,
      }),
    [connectionId],
  );

  const { execute, loading, error, success } = useAsyncAction(updateConnectionAction, {
    defaultErrorMessage: 'Failed to update connection',
  });

  return { updateConnection: execute, loading, error, success };
}
