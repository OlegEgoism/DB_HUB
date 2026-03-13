import { apiRequest } from '@shared/api/http';
import type {
  AppUser,
  AppUserCreatePayload,
  AppUserUpdatePayload,
  PaginatedUsersResponse,
} from '@pages/app-users/model/types';

interface FetchUsersParams {
  page: number;
  size: number;
  search?: string;
}

export function fetchAppUsers({ page, size, search }: FetchUsersParams) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
  });

  if (search?.trim()) {
    params.set('search', search.trim());
  }

  return apiRequest<PaginatedUsersResponse>(`/api/v1/app_users?${params.toString()}`, { withAuth: true });
}

export function createAppUser(payload: AppUserCreatePayload) {
  return apiRequest<AppUser>('/api/v1/app_users', {
    method: 'POST',
    withAuth: true,
    body: JSON.stringify(payload),
  });
}

export function updateAppUser(userId: number, payload: AppUserUpdatePayload) {
  return apiRequest<AppUser>(`/api/v1/app_users/${userId}`, {
    method: 'PUT',
    withAuth: true,
    body: JSON.stringify(payload),
  });
}

export function deleteAppUser(userId: number) {
  return apiRequest<void>(`/api/v1/app_users/${userId}`, {
    method: 'DELETE',
    withAuth: true,
  });
}
