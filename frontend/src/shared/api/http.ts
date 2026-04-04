const DEFAULT_API_BASE_URL =
  typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : 'http://localhost:8000';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export interface RequestOptions extends RequestInit {
  withAuth?: boolean;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { withAuth = false, headers, ...restOptions } = options;

  const mergedHeaders = new Headers(headers);

  if (!mergedHeaders.has('Content-Type') && restOptions.body) {
    mergedHeaders.set('Content-Type', 'application/json');
  }

  if (withAuth) {
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('access_token') : null;
    if (!token) {
      throw new ApiError(401, 'Пользователь не авторизован');
    }
    mergedHeaders.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...restOptions,
    headers: mergedHeaders,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new ApiError(response.status, errorData?.detail || `HTTP error! status: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
