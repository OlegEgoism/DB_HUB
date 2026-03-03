import { useEffect, useState } from 'react';
import type { Documentation } from '@shared/types/documentations';
import { apiRequest } from '@shared/api/http';

interface DocumentationsResponse {
  items: Documentation[];
}

export function useDocumentations() {
  const [documentations, setDocumentations] = useState<Documentation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocumentations = async () => {
      try {
        setLoading(true);
        const data = await apiRequest<DocumentationsResponse>('/api/v1/app_content/documentations?is_active=true');
        setDocumentations(data.items || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch documentations');
      } finally {
        setLoading(false);
      }
    };

    fetchDocumentations();
  }, []);

  return { documentations, loading, error };
}
