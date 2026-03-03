import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import type { Connection, DatabaseMetrics } from '@pages/connections/model/detail-page-types';
import { getConnectionById, getConnectionMetrics } from './api';

export function useConnectionDetailCore(id?: string) {
  const navigate = useNavigate();
  const [connection, setConnection] = useState<Connection | null>(null);
  const [metrics, setMetrics] = useState<DatabaseMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConnection = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getConnectionById(id);
      setConnection(data);
    } catch (err) {
      if (err instanceof Error && err.message.includes('не авторизован')) {
        navigate('/login');
        return;
      }
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  const loadMetrics = useCallback(async () => {
    if (!id) return;

    setLoadingMetrics(true);
    setError(null);

    try {
      const data = await getConnectionMetrics(id);
      setMetrics(data);
    } catch (err) {
      if (err instanceof Error && err.message.includes('не авторизован')) {
        navigate('/login');
        return;
      }
      setError(err instanceof Error ? err.message : 'Не удалось загрузить информацию');
    } finally {
      setLoadingMetrics(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    if (id) {
      loadConnection();
    }
  }, [id, loadConnection]);

  return {
    connection,
    setConnection,
    metrics,
    setMetrics,
    loading,
    loadingMetrics,
    error,
    setError,
    loadConnection,
    loadMetrics,
  };
}
