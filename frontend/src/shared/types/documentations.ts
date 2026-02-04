// frontend/src/shared/types/documentations.ts

export interface Documentation {
    number: string;
    title: string;
    content: string;
    is_active: boolean;
    id: number;
    created_at: string | null;
}