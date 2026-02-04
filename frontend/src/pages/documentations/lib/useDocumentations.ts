import { useEffect, useState } from 'react';
import type { Documentation } from '@shared/types/documentations';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export function useDocumentations() {
    const [documentations, setDocumentations] = useState<Documentation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDocumentations = async () => {
            try {
                setLoading(true);
                const response = await fetch(`${API_BASE_URL}/api/v1/app_documentations`);

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data: Documentation[] = await response.json();
                setDocumentations(data);
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch documentations');
                console.error('Error fetching documentations:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchDocumentations();
    }, []);

    return { documentations, loading, error };
}