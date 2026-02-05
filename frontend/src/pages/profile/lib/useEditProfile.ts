// frontend/src/pages/profile/lib/useEditProfile.ts
import {useState} from 'react';
import type {User} from '@shared/types/user';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface EditProfileData {
    email: string;
    fio: string;
    role: string;
}

export function useEditProfile(userId: number) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const updateProfile = async (data: EditProfileData) => {
        try {
            setLoading(true);
            setError(null);
            setSuccess(false);

            const token = localStorage.getItem('access_token');

            if (!token) {
                throw new Error('Пользователь не авторизован');
            }

            const response = await fetch(`${API_BASE_URL}/api/v1/app_users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.detail || `HTTP error! status: ${response.status}`);
            }

            const updatedUser: User = await response.json();
            setSuccess(true);
            return updatedUser;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update profile');
            console.error('Update profile error:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return {updateProfile, loading, error, success};
}
