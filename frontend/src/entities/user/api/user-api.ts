import type { User } from '@shared/types/user';
import type { RegisterUserPayload } from '@entities/user/model';
import { apiRequest } from '@shared/api/http';

export function getUserById(userId: number) {
  return apiRequest<User>(`/api/v1/app_users/${userId}`, { withAuth: true });
}

export function registerUser(payload: RegisterUserPayload) {
  return apiRequest<User>('/api/v1/app_users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
