import { useState } from 'react';
import { apiRequest } from '@shared/api/http';

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

      const newConnection = await apiRequest('/api/v1/db_connections', {
        method: 'POST',
        body: JSON.stringify(data),
        withAuth: true,
      });

      setSuccess(true);
      return newConnection;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create connection');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createConnection, loading, error, success };
}
