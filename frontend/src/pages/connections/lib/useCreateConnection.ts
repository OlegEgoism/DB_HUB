// frontend/src/pages/connections/lib/useCreateConnection.ts
import { useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface CreateConnectionData {
  name: string;
  description: string | null;
  database_type: string;
  environment: string;
  is_favorite: boolean;
  host: string;
  port: number;
  database_name: string;
  username: string;
  password: string;
  owner_id: number;
}

export function useCreateConnection() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const createConnection = async (data: CreateConnectionData) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Пользователь не авторизован');
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/db_connections`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || `HTTP error! status: ${response.status}`);
      }

      const newConnection = await response.json();
      setSuccess(true);
      return newConnection;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create connection');
      console.error('Create connection error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createConnection, loading, error, success };
}