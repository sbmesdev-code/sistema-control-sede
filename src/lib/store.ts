import { create } from 'zustand';
import { db } from './firebase';
import {
    collection,
    onSnapshot,
    setDoc,
    doc,
    updateDoc,
    deleteDoc,
    query,
    orderBy
} from 'firebase/firestore';
import type { Product } from '../types/inventory';
import { toast } from 'sonner';


interface InventoryState {
    products: Product[];
    loading: boolean;
    initialized: boolean;

    initializeSubscription: () => () => void;
    addProduct: (product: Product) => Promise<void>;
    updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
    removeProduct: (id: string) => Promise<void>;
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
    products: [],
    loading: true,
    initialized: false,

    initializeSubscription: () => {
        if (get().initialized) return () => { };

        const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(q, (snapshot) => {
            const products = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product));

            // Seed if empty on first load (Optional logic)
            if (products.length === 0 && !get().initialized) {
                // Could seed here... but let's leave it to manual entry or a separate seed function to avoid accidental dupes 
                // if data is just taking long to load. 
                // Actually, let's allow it to be empty.
            }

            set({ products, loading: false, initialized: true });
        }, (error) => {
            console.error("Error fetching inventory:", error);
            toast.error("Error cargando inventario");
        });

        // Initialize set to true (loading false handled in snapshot)
        set({ initialized: true });
        return unsub;
    },

    addProduct: async (product) => {
        try {
            // If ID is provided (e.g. Generated UUID), use setDoc, else addDoc
            await setDoc(doc(db, 'products', product.id), product);
            toast.success('Producto agregado');
        } catch (error) {
            console.error(error);
            toast.error('Error al agregar producto');
        }
    },

    updateProduct: async (id, updatedData) => {
        try {
            await updateDoc(doc(db, 'products', id), {
                ...updatedData,
                updatedAt: Date.now()
            });
            toast.success('Producto actualizado');
        } catch (error) {
            console.error(error);
            toast.error('Error al actualizar producto');
        }
    },

    removeProduct: async (id) => {
        try {
            await deleteDoc(doc(db, 'products', id));
            toast.success('Producto eliminado');
        } catch (error) {
            console.error(error);
            toast.error('Error al eliminar producto');
        }
    }
}));
