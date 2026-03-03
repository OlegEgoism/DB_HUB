import { useState } from 'react';
import type { RegisterUserPayload } from '@entities/user/model';
import { registerUser } from '@entities/user/api/user-api';

export function useSignUp() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const register = async (userData: RegisterUserPayload) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const user = await registerUser(userData);
      setSuccess(true);

      return user;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register user');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { register, loading, error, success };
}
