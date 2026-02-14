// frontend/src/pages/profile/lib/useProfile.ts
import { useEffect, useState } from 'react';
import type { User } from '@shared/types/user';
import { useLogin } from '@pages/auth/lib/useLogin';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export function useProfile() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getUser } = useLogin();

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        // Получаем данные текущего пользователя из localStorage
        const currentUser = getUser();
        const token = localStorage.getItem('access_token');

        if (!currentUser || !token) {
          throw new Error('Пользователь не авторизован');
        }

        // Запрашиваем полные данные пользователя из API
        const response = await fetch(`${API_BASE_URL}/api/v1/app_users/${currentUser.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.detail || `HTTP error! status: ${response.status}`);
        }

        const userData: User = await response.json();
        setUser(userData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch user profile');
        console.error('Error fetching user profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  return { user, loading, error };
}