// frontend/src/shared/types/user.ts

export interface User {
    username: string;
    email: string;
    fio: string;
    role: string;
    password: string;
}

export type UserRole =
    | 'Администратор БД'
    | 'Аналитик'
    | 'Разработчик'
    | 'Тестировщик'
    | 'Пользователь';