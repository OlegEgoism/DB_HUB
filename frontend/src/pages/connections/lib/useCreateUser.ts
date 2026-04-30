import { useCallback } from 'react';
import { apiRequest } from '@shared/api/http';
import { useAsyncAction } from '@shared/lib/useAsyncAction';

export interface CreateUserData {
  username: string;
  password: string;
  email: string;
  description: string;
}

export function useCreateUser(connectionId: number) {
  const createUserAction = useCallback(
    (data: CreateUserData) =>
      apiRequest(`/api/v1/db_connections/${connectionId}/users`, {
        method: 'POST',
        body: JSON.stringify(data),
        withAuth: true,
      }),
    [connectionId],
  );

  const { execute, loading, error, success } = useAsyncAction(createUserAction, {
    defaultErrorMessage: 'Failed to create user',
  });

  return { createUser: execute, loading, error, success };
}
