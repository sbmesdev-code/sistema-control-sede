export type ExpenseCategory = 'ALQUILER' | 'SERVICIOS' | 'PERSONAL' | 'MARKETING' | 'IMPUESTOS' | 'MATERIALES' | 'LOGISTICA' | 'OTROS';

export interface Expense {
    id: string; // UUID or Auto-generated
    description: string;
    amount: number;
    category: ExpenseCategory;
    date: number; // Timestamp of the expense date (user can select past dates)
    createdAt: number; // Timestamp of record creation
    updatedAt: number;
    notes?: string;
    isFixed?: boolean;
}

export interface ExpenseFormData {
    description: string;
    amount: number;
    category: ExpenseCategory;
    date: Date; // For DatePicker
    notes?: string;
    isFixed: boolean;
}
