// frontend/src/shared/types/user.ts
export interface User {
  id: number;
  username: string;
  email: string;
  fio: string;
  role: string;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string | null;
  updated_at: string | null;
  last_login: string | null;
}

export type UserRole =
  | 'Администратор БД'
  | 'Аналитик'
  | 'Разработчик'
  | 'Тестировщик'
  | 'Пользователь';