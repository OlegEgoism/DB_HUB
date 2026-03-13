import type { UserRole } from '@shared/types/user';

export interface AppUser {
  id: number;
  username: string;
  email: string;
  fio: string | null;
  role: UserRole;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string | null;
  updated_at: string | null;
  last_login: string | null;
}

export interface PaginatedUsersResponse {
  items: AppUser[];
  total: number;
  page: number;
  size: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface AppUserCreatePayload {
  username: string;
  email: string;
  fio: string;
  role: UserRole;
  password: string;
}

export interface AppUserUpdatePayload {
  email: string;
  fio: string;
  role: UserRole;
  is_active: boolean;
  is_superuser: boolean;
}

export const USER_ROLES: UserRole[] = [
  'Администратор БД',
  'Аналитик',
  'Разработчик',
  'Тестировщик',
  'Пользователь',
];

export const USERS_PAGE_SIZES = [5, 10, 20, 50] as const;
