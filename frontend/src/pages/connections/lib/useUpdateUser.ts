// frontend/src/pages/connections/lib/useUpdateUser.ts
import {useState} from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface UpdateUserData {
    password?: string;
    description?: string;
    email?: string;
}

export function useUpdateUser(connectionId: number, userOid: number) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const updateUser = async (data: UpdateUserData) => {
        try {
            setLoading(true);
            setError(null);
            setSuccess(false);

            const token = localStorage.getItem('access_token');
            if (!token) {
                throw new Error('Пользователь не авторизован');
            }

            const response = await fetch(
                `${API_BASE_URL}/api/v1/db_connections/${connectionId}/users/${userOid}`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data),
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.detail || `HTTP error! status: ${response.status}`);
            }

            const updatedUser = await response.json();
            setSuccess(true);
            return updatedUser;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update user');
            console.error('Update user error:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return {updateUser, loading, error, success};
}