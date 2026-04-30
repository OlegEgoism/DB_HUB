import { useCallback } from 'react';
import type { LoginCredentials, LoginResponse } from '@entities/session/model/types';
import { sessionStorageModel } from '@entities/session/model/storage';
import { apiRequest } from '@shared/api/http';
import { useAsyncAction } from '@shared/lib/useAsyncAction';

export function useSignIn() {
  const signInAction = useCallback(async (credentials: LoginCredentials) => {
    const data = await apiRequest<LoginResponse>('/api/v1/app_auth/login-form', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    sessionStorageModel.setSession(data.token.access_token, data.user);
    return data;
  }, []);

  const { execute, loading, error, success } = useAsyncAction(signInAction, {
    defaultErrorMessage: 'Failed to login',
  });

  return { login: execute, loading, error, success };
}
