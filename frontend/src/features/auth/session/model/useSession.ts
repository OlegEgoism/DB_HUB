import { useCallback } from 'react';
import { sessionStorageModel } from '@entities/session/model/storage';
import { apiRequest } from '@shared/api/http';

export function useSession() {
  const logout = useCallback(() => {
    const token = sessionStorageModel.getToken();
    sessionStorageModel.clearSession();

    if (token) {
      apiRequest<void>('/api/v1/app_auth/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }).catch(() => undefined);
    }
  }, []);

  const checkAuth = useCallback(() => sessionStorageModel.hasSession(), []);

  const getUser = useCallback(() => sessionStorageModel.getUser(), []);
  const getToken = useCallback(() => sessionStorageModel.getToken(), []);

  const validateSession = useCallback(async () => {
    if (!sessionStorageModel.hasSession()) {
      return false;
    }
    try {
      await apiRequest('/api/v1/app_auth/validate-token', { method: 'POST', withAuth: true });
      return true;
    } catch {
      sessionStorageModel.clearSession();
      return false;
    }
  }, []);

  return {
    logout,
    checkAuth,
    validateSession,
    getUser,
    getToken,
  };
}
