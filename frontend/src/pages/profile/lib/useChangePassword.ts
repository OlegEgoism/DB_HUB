// frontend/src/pages/profile/lib/useChangePassword.ts
import { useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

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

      const token = localStorage.getItem('access_token');

      if (!token) {
        throw new Error('Пользователь не авторизован');
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/app_users/${userId}/change-password`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || `HTTP error! status: ${response.status}`);
      }

      setSuccess(true);
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
      console.error('Change password error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { changePassword, loading, error, success };
}