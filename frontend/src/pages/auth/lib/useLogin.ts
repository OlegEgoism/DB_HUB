// frontend/src/pages/auth/lib/useLogin.ts
import { useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: number;
    username: string;
    email: string;
    fio: string;
    role: string;
    is_active: boolean;
    is_superuser: boolean;
    last_login: string | null;
  };
  token: {
    access_token: string;
    token_type: string;
  };
}

export function useLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const login = async (credentials: LoginCredentials) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const response = await fetch(`${API_BASE_URL}/api/v1/app_auth/login-form`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || `HTTP error! status: ${response.status}`);
      }

      const data: LoginResponse = await response.json();

      // Сохраняем токен и данные пользователя в localStorage
      localStorage.setItem('access_token', data.token.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));

      setSuccess(true);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to login');
      console.error('Login error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    // Удаляем токен и данные пользователя
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');

    // Опционально: вызываем API для выхода
    const token = localStorage.getItem('access_token');
    if (token) {
      fetch(`${API_BASE_URL}/api/v1/app_auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }).catch(err => {
        console.error('Logout API error:', err);
      });
    }
  };

  // Проверка авторизации
  const checkAuth = () => {
    const token = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user');
    return token && userData;
  };

  // Получение данных пользователя
  const getUser = () => {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  };

  return { login, loading, error, success, logout, checkAuth, getUser };
}