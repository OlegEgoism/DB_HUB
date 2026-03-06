import { useState } from 'react';
import { apiRequest } from '@shared/api/http';

export interface CreateUserData {
  username: string;
  password: string;
  email: string;
  description: string;
}

export function useCreateUser(connectionId: number) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const createUser = async (data: CreateUserData) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const newUser = await apiRequest(`/api/v1/db_connections/${connectionId}/users`, {
        method: 'POST',
        body: JSON.stringify(data),
        withAuth: true,
      });

      setSuccess(true);
      return newUser;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createUser, loading, error, success };
}
