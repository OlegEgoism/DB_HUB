import { useState } from 'react';
import { apiRequest } from '@shared/api/http';

export interface EditConnectionData {
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

export function useEditConnection(connectionId: number) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const updateConnection = async (data: Partial<EditConnectionData>) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const updatedConnection = await apiRequest(`/api/v1/db_connections/${connectionId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
        withAuth: true,
      });

      setSuccess(true);
      return updatedConnection;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update connection');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { updateConnection, loading, error, success };
}
