import { useCallback } from 'react';
import { apiRequest } from '@shared/api/http';
import { useAsyncAction } from '@shared/lib/useAsyncAction';

export interface ChangePasswordData {
  new_password: string;
}

export function useChangePassword(userId: number) {
  const changePasswordAction = useCallback(
    (data: ChangePasswordData) =>
      apiRequest(`/api/v1/app_users/${userId}/change-password`, {
        method: 'PATCH',
        body: JSON.stringify(data),
        withAuth: true,
      }),
    [userId],
  );

  const { execute, loading, error, success } = useAsyncAction(changePasswordAction, {
    defaultErrorMessage: 'Failed to change password',
  });

  return { changePassword: execute, loading, error, success };
}
