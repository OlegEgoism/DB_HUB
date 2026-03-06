import { sessionStorageModel } from '@entities/session/model/storage';
import { apiRequest } from '@shared/api/http';

export function useSession() {
  const logout = () => {
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
  };

  return {
    logout,
    checkAuth: () => sessionStorageModel.hasSession(),
    getUser: () => sessionStorageModel.getUser(),
    getToken: () => sessionStorageModel.getToken(),
  };
}
