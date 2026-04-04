const DEFAULT_API_BASE_URL =
  typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : 'http://localhost:8000';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;
export const DB_CONNECTION_STATUS_EVENT = 'db-connection-status-change';
let dbMonitoringInitialized = false;

function emitDbConnectionStatus(hasIssue: boolean, message?: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(DB_CONNECTION_STATUS_EVENT, {
      detail: { hasIssue, message },
    }),
  );
}

function isDbConnectionProblem(status: number, message: string): boolean {
  const normalized = message.toLowerCase();

  if (status >= 500) {
    return true;
  }

  return (
    normalized.includes('database') ||
    normalized.includes('подключ') ||
    normalized.includes('connection') ||
    normalized.includes('timeout') ||
    normalized.includes('refused')
  );
}

function isDbConnectionsApiRequest(input: RequestInfo | URL): boolean {
  const rawUrl =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

  return rawUrl.includes('/api/v1/db_connections');
}

export function initDbConnectionMonitoring() {
  if (typeof window === 'undefined' || dbMonitoringInitialized) {
    return;
  }

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let response: Response;

    try {
      response = await originalFetch(input, init);
    } catch (error) {
      if (isDbConnectionsApiRequest(input)) {
        emitDbConnectionStatus(true);
      }
      throw error;
    }

    if (isDbConnectionsApiRequest(input)) {
      if (!response.ok) {
        const errorData = await response.clone().json().catch(() => null);
        const errorMessage = errorData?.detail || `HTTP error! status: ${response.status}`;

        if (isDbConnectionProblem(response.status, errorMessage)) {
          emitDbConnectionStatus(true, errorMessage);
        }
      } else {
        emitDbConnectionStatus(false);
      }
    }

    return response;
  };

  dbMonitoringInitialized = true;
}

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

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...restOptions,
      headers: mergedHeaders,
    });
  } catch (error) {
    emitDbConnectionStatus(true);
    throw error;
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const errorMessage = errorData?.detail || `HTTP error! status: ${response.status}`;

    if (isDbConnectionProblem(response.status, errorMessage)) {
      emitDbConnectionStatus(true, errorMessage);
    }

    throw new ApiError(response.status, errorMessage);
  }

  emitDbConnectionStatus(false);

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
