import { useState } from 'react';
import { apiRequest } from '@shared/api/http';

export interface UpdateUserData {
  password?: string;
  description?: string;
  email?: string;
}

export function useUpdateUser(connectionId: number, userOid: number) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const updateUser = async (data: UpdateUserData) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const updatedUser = await apiRequest(`/api/v1/db_connections/${connectionId}/users/${userOid}`, {
        method: 'PUT',
        body: JSON.stringify(data),
        withAuth: true,
      });

      setSuccess(true);
      return updatedUser;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { updateUser, loading, error, success };
}
