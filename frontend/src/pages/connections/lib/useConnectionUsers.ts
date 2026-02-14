// frontend/src/pages/connections/lib/useConnectionUsers.ts
import { useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface DBUser {
  oid: number;
  name: string;
  description: string | null;
  email: string | null;
}

export interface UsersResponse {
  items: DBUser[];
  total: number;
  page: number;
  size: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export function useConnectionUsers(
  connectionId: number,
  page: number = 1,
  size: number = 20,
  search: string | null = null
) {
  const [users, setUsers] = useState<DBUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('access_token');
        if (!token) {
          setError('Пользователь не авторизован');
          return;
        }

        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('size', size.toString());
        if (search && search.trim()) {
          params.append('search', search.trim());
        }

        const response = await fetch(
          `${API_BASE_URL}/api/v1/db_connections/${connectionId}/users?${params.toString()}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData?.detail || `Ошибка: ${response.status}`);
        }

        const data: UsersResponse = await response.json();
        setUsers(data.items);
        setTotal(data.total);
        setPages(data.pages);
        setHasNext(data.has_next);
        setHasPrev(data.has_prev);
      } catch (err) {
        console.error('Ошибка загрузки пользователей:', err);
        setError(err instanceof Error ? err.message : 'Не удалось загрузить пользователей');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [connectionId, page, size, search]);

  return { users, loading, error, total, pages, hasNext, hasPrev };
}