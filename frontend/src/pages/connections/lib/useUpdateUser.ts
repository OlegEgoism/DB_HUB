import { useCallback } from 'react';
import { apiRequest } from '@shared/api/http';
import { useAsyncAction } from '@shared/lib/useAsyncAction';

export interface UpdateUserData {
  password?: string;
  description?: string;
  email?: string;
}

export function useUpdateUser(connectionId: number, userOid: number) {
  const updateUserAction = useCallback(
    (data: UpdateUserData) =>
      apiRequest(`/api/v1/db_connections/${connectionId}/users/${userOid}`, {
        method: 'PUT',
        body: JSON.stringify(data),
        withAuth: true,
      }),
    [connectionId, userOid],
  );

  const { execute, loading, error, success } = useAsyncAction(updateUserAction, {
    defaultErrorMessage: 'Failed to update user',
  });

  return { updateUser: execute, loading, error, success };
}
