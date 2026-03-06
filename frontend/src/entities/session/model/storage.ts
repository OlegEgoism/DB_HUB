import type { SessionUser } from './types';

const TOKEN_KEY = 'access_token';
const USER_KEY = 'user';

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export const sessionStorageModel = {
  setSession(token: string, user: SessionUser) {
    if (!canUseStorage()) {
      return;
    }

    window.localStorage.setItem(TOKEN_KEY, token);
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  clearSession() {
    if (!canUseStorage()) {
      return;
    }

    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  },

  getToken() {
    if (!canUseStorage()) {
      return null;
    }

    return window.localStorage.getItem(TOKEN_KEY);
  },

  getUser(): SessionUser | null {
    if (!canUseStorage()) {
      return null;
    }

    const userData = window.localStorage.getItem(USER_KEY);
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
