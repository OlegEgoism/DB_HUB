import { useState } from 'react';
import type { User } from '@shared/types/user';
import { apiRequest } from '@shared/api/http';

export interface EditProfileData {
  email: string;
  fio: string;
}

export function useEditProfile(userId: number) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const updateProfile = async (data: EditProfileData) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const updatedUser = await apiRequest<User>(`/api/v1/app_users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
        withAuth: true,
      });

      setSuccess(true);
      return updatedUser;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { updateProfile, loading, error, success };
}
