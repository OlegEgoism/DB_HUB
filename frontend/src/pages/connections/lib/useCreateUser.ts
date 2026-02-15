// frontend/src/pages/connections/lib/useCreateUser.ts
import { useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

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

      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Пользователь не авторизован');
      }

      const response = await fetch(
        `${API_BASE_URL}/api/v1/db_connections/${connectionId}/users`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || `HTTP error! status: ${response.status}`);
      }

      const newUser = await response.json();
      setSuccess(true);
      return newUser;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
      console.error('Create user error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createUser, loading, error, success };
}