export interface Connection {
  id: number;
  database_name: string;
  description: string | null;
  host: string;
  port: number;
  username: string;
  name: string;
  database_type: string;
  environment: string;
  is_favorite: boolean;
  owner_id: number;
  owner_username: string;
  status: string;
  db_size_mb: number | null;
  created_at: string;
  updated_at: string;
}

export interface ConnectionsResponse {
  items: Connection[];
  total: number;
  page: number;
  size: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export type ConnectionsTab = 'Все' | 'Избранные' | 'Продакшн' | 'Разработка' | 'Тестирование' | 'Аналитика';
