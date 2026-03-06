import { useEffect, useState } from 'react';
import type { Agreement } from '@shared/types/agreements';
import { apiRequest } from '@shared/api/http';

interface AgreementsResponse {
  items: Agreement[];
}

export function useAgreements() {
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAgreements = async () => {
      try {
        setLoading(true);
        const data = await apiRequest<AgreementsResponse>('/api/v1/app_content/agreements?is_active=true');
        setAgreements(data.items || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch agreements');
      } finally {
        setLoading(false);
      }
    };

    fetchAgreements();
  }, []);

  return { agreements, loading, error };
}
