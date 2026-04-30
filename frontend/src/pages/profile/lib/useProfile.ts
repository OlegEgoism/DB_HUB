import { useEffect, useState } from 'react';
import type { User } from '@shared/types/user';
import { getUserById } from '@entities/user/api/user-api';
import { useSession } from '@features/auth';

const UNAUTHORIZED_ERROR = 'Пользователь не авторизован';
const DEFAULT_PROFILE_ERROR = 'Failed to fetch user profile';

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
          throw new Error(UNAUTHORIZED_ERROR);
        }

        const userData = await getUserById(currentUser.id);
        setUser(userData);
      } catch (err) {
        setError(err instanceof Error ? err.message : DEFAULT_PROFILE_ERROR);
      } finally {
        setLoading(false);
      }
    };

    void fetchUserProfile();
  }, [getUser]);

  return { user, loading, error };
}
