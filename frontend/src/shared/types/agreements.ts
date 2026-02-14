// frontend/src/shared/types/agreements.ts

export interface Agreement {
    number: string;
    title: string;
    content: string;
    is_active: boolean;
    id: number;
    created_at: string | null;
}