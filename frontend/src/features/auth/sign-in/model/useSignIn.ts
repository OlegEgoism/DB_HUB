import { useState } from 'react';
import type { LoginCredentials, LoginResponse } from '@entities/session/model/types';
import { sessionStorageModel } from '@entities/session/model/storage';
import { apiRequest } from '@shared/api/http';

export function useSignIn() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const login = async (credentials: LoginCredentials) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const data = await apiRequest<LoginResponse>('/api/v1/app_auth/login-form', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });

      sessionStorageModel.setSession(data.token.access_token, data.user);
      setSuccess(true);

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to login');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { login, loading, error, success };
}
