import { useEffect, useState } from 'react';
import type { User } from '@shared/types/user';
import { getUserById } from '@entities/user/api/user-api';
import { useSession } from '@features/auth';

export function useProfile() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getUser } = useSession();

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        const currentUser = getUser();

        if (!currentUser) {
          throw new Error('Пользователь не авторизован');
        }

        const userData = await getUserById(currentUser.id);
        setUser(userData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch user profile');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  return { user, loading, error };
}
