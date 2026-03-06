export interface SessionUser {
  id: number;
  username: string;
  email: string;
  fio: string;
  role: string;
  is_active: boolean;
  is_superuser: boolean;
  last_login: string | null;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: SessionUser;
  token: {
    access_token: string;
    token_type: string;
  };
}
