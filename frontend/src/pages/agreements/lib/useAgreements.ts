// frontend/src/pages/agreements/lib/useAgreements.ts

import {useEffect, useState} from 'react';
import type {Agreement} from '@shared/types/agreements';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export function useAgreements() {
    const [agreements, setAgreements] = useState<Agreement[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAgreements = async () => {
            try {
                setLoading(true);
                // Используем правильный эндпоинт с фильтрацией по типу и активности
                const response = await fetch(
                    `${API_BASE_URL}/api/v1/app_content/agreements?is_active=true`,
                    {
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    }
                );

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                setAgreements(data.items || []);
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch agreements');
                console.error('Error fetching agreements:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchAgreements();
    }, []);

    return {agreements, loading, error};
}