import type { SessionUser } from './types';

const TOKEN_KEY = 'access_token';
const USER_KEY = 'user';

export const sessionStorageModel = {
  setSession(token: string, user: SessionUser) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  getUser(): SessionUser | null {
    const userData = localStorage.getItem(USER_KEY);
    if (!userData) {
      return null;
    }

    try {
      return JSON.parse(userData) as SessionUser;
    } catch {
      return null;
    }
  },

  hasSession() {
    return Boolean(this.getToken() && this.getUser());
  },
};
