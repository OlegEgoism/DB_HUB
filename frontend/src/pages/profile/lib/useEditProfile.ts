import { useCallback } from 'react';
import type { User } from '@shared/types/user';
import { apiRequest } from '@shared/api/http';
import { useAsyncAction } from '@shared/lib/useAsyncAction';

export interface EditProfileData {
  email: string;
  fio: string;
}

export function useEditProfile(userId: number) {
  const updateProfileAction = useCallback(
    (data: EditProfileData) =>
      apiRequest<User>(`/api/v1/app_users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
        withAuth: true,
      }),
    [userId],
  );

  const { execute, loading, error, success } = useAsyncAction(updateProfileAction, {
    defaultErrorMessage: 'Failed to update profile',
  });

  return { updateProfile: execute, loading, error, success };
}
