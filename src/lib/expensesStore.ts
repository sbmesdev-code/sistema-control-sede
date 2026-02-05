import { create } from 'zustand';
import { db } from './firebase';
import {
    collection,
    onSnapshot,
    addDoc,
    doc,
    updateDoc,
    deleteDoc,
    query,
    orderBy
} from 'firebase/firestore';
import type { Expense } from '../types/expenses';
import { toast } from 'sonner';

interface ExpensesState {
    expenses: Expense[];
    loading: boolean;
    initialized: boolean;

    initializeSubscription: () => () => void;
    addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
    updateExpense: (id: string, expense: Partial<Expense>) => Promise<void>;
    removeExpense: (id: string) => Promise<void>;
    cleanup: () => void;
}

export const useExpensesStore = create<ExpensesState>((set) => ({
    expenses: [],
    loading: true,
    initialized: false,

    initializeSubscription: () => {
        const q = query(collection(db, 'expenses'), orderBy('date', 'desc'));

        const unsub = onSnapshot(q, (snapshot) => {
            const expenses = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Expense));
            set({ expenses, loading: false, initialized: true });
        }, (error) => {
            console.error("Error fetching expenses:", error);
            toast.error("Error cargando gastos");
        });

        set({ initialized: true });
        return unsub;
    },

    addExpense: async (expenseData) => {
        try {
            await addDoc(collection(db, 'expenses'), expenseData);
            toast.success('Gasto registrado');
        } catch (error) {
            console.error(error);
            toast.error('Error al registrar gasto');
        }
    },

    updateExpense: async (id, updatedData) => {
        try {
            await updateDoc(doc(db, 'expenses', id), {
                ...updatedData,
                updatedAt: Date.now()
            });
            toast.success('Gasto actualizado');
        } catch (error) {
            console.error(error);
            toast.error('Error al actualizar gasto');
        }
    },

    removeExpense: async (id) => {
        try {
            await deleteDoc(doc(db, 'expenses', id));
            toast.success('Gasto eliminado');
        } catch (error) {
            console.error(error);
            toast.error('Error al eliminar gasto');
        }
    },

    cleanup: () => {
        set({ expenses: [], loading: true, initialized: false });
    }
}));
