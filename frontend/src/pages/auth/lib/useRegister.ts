// frontend/src/pages/auth/lib/useRegister.ts

import {useState} from 'react';
import type {User} from '@shared/types/user';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export function useRegister() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const register = async (userData: User) => {
        try {
            setLoading(true);
            setError(null);
            setSuccess(false);

            const response = await fetch(`${API_BASE_URL}/api/v1/app_users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.detail || `HTTP error! status: ${response.status}`);
            }

            setSuccess(true);
            return await response.json();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to register user');
            console.error('Registration error:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return {register, loading, error, success};
}