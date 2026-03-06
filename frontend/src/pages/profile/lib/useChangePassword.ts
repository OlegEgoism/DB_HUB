import { useState } from 'react';
import { apiRequest } from '@shared/api/http';

export interface ChangePasswordData {
  new_password: string;
}

export function useChangePassword(userId: number) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const changePassword = async (data: ChangePasswordData) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const result = await apiRequest(`/api/v1/app_users/${userId}/change-password`, {
        method: 'PATCH',
        body: JSON.stringify(data),
        withAuth: true,
      });

      setSuccess(true);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { changePassword, loading, error, success };
}
