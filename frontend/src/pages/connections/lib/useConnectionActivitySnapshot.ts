import { useEffect, useState } from 'react';
import { apiRequest } from '@shared/api/http';

export interface UserActivitySnapshot {
  username: string;
  sessions_total: number;
  active_sessions: number;
  active_transactions: number;
}

export interface ActivitySnapshotResponse {
  sessions_total: number;
  active_sessions: number;
  idle_in_transaction_sessions: number;
  lock_waiting_sessions: number;
  longest_transaction_seconds: number;
  users: UserActivitySnapshot[];
}

export function useConnectionActivitySnapshot(
  connectionId: number | null,
  reloadTrigger: number = 0,
  refreshIntervalMs: number = 5000,
) {
  const [snapshot, setSnapshot] = useState<ActivitySnapshotResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!connectionId) {
      return;
    }

    let isCancelled = false;

    const fetchSnapshot = async (withLoader = false) => {
      try {
        if (withLoader) {
          setLoading(true);
        }
        const data = await apiRequest<ActivitySnapshotResponse>(
          `/api/v1/db_connections/${connectionId}/activity_snapshot`,
          { withAuth: true },
        );

        if (!isCancelled) {
          setSnapshot(data);
          setError(null);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'Не удалось загрузить срез активности');
        }
      } finally {
        if (!isCancelled && withLoader) {
          setLoading(false);
        }
      }
    };

    void fetchSnapshot(true);

    const timerId = window.setInterval(() => {
      void fetchSnapshot(false);
    }, refreshIntervalMs);

    return () => {
      isCancelled = true;
      window.clearInterval(timerId);
    };
  }, [connectionId, reloadTrigger, refreshIntervalMs]);

  return { snapshot, loading, error };
}
