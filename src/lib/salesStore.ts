import { create } from 'zustand';
import { db } from './firebase';
import {
    collection,
    onSnapshot,
    setDoc,
    doc,
    updateDoc,
    query,
    orderBy
} from 'firebase/firestore';
import type { Sale, SaleItem, PromotionRule } from '../types/sales';
import { toast } from 'sonner';

interface SalesState {
    sales: Sale[];
    promotions: PromotionRule[];
    loading: boolean;
    initialized: boolean;

    // Actions
    initializeSubscription: () => () => void; // Returns unsubscribe function
    addSale: (sale: Sale) => Promise<void>;
    updateSaleStatus: (id: string, status: Sale['status']) => Promise<void>;
    addPromotion: (rule: PromotionRule) => Promise<void>;
    togglePromotion: (id: string) => Promise<void>;
    removePromotion: (id: string) => Promise<void>;
    deleteSale: (id: string) => Promise<void>;

    // Logic
    calculateCartTotal: (items: SaleItem[], globalDiscount: number, shippingCost?: number) => { subtotal: number, discountTotal: number, shippingCost: number, total: number, appliedPromotions: string[] };
    cleanup: () => void;
}

export const useSalesStore = create<SalesState>((set, get) => ({
    sales: [],
    promotions: [],
    loading: true,
    initialized: false,

    initializeSubscription: () => {
        // We allow re-subscription to handle React Strict Mode / Re-auth flows correctly.


        // 1. Subscribe to Sales
        const salesQuery = query(collection(db, 'sales'), orderBy('createdAt', 'desc'));
        const unsubSales = onSnapshot(salesQuery, (snapshot) => {
            const sales = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Sale));
            set({ sales });
        }, (error) => {
            console.error("Error fetching sales:", error);
            toast.error("Error cargando ventas desde la nube");
        });

        // 2. Subscribe to Promotions
        const promotionsQuery = collection(db, 'promotions');
        const unsubPromotions = onSnapshot(promotionsQuery, (snapshot) => {
            const promotions = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as PromotionRule));
            // Initialize defaults if empty (optional, for first run)
            if (promotions.length === 0 && !get().initialized) {
                // We could seed initial promotions here if needed, but skipping for clean state.
            }
            set({ promotions });
        }, (error) => {
            console.error("Error fetching promotions:", error);
        });

        set({ initialized: true, loading: false });

        return () => {
            unsubSales();
            unsubPromotions();
        };
    },

    addSale: async (sale) => {
        try {
            // We use setDoc to ensure the ID matches if provided, or addDoc if not but types say ID is required.
            // Assuming the UI generates an ID before calling addSale.
            await setDoc(doc(db, 'sales', sale.id), sale);
            toast.success('Venta registrada en la nube');
        } catch (error) {
            console.error(error);
            toast.error('Error al guardar venta');
            throw error;
        }
    },

    updateSaleStatus: async (id, status) => {
        try {
            await updateDoc(doc(db, 'sales', id), {
                status,
                updatedAt: Date.now()
            });
            toast.success('Estado actualizado');
        } catch (error) {
            console.error(error);
            toast.error('Error al actualizar estado');
        }
    },

    addPromotion: async (rule) => {
        try {
            // Use setDoc if ID provided, else addDoc (but type has ID).
            await setDoc(doc(db, 'promotions', rule.id), rule);
            toast.success('Promoción guardada');
        } catch (error) {
            console.error(error);
            toast.error('Error al guardar promoción');
        }
    },

    togglePromotion: async (id) => {
        const promo = get().promotions.find(p => p.id === id);
        if (!promo) return;
        try {
            await updateDoc(doc(db, 'promotions', id), {
                isActive: !promo.isActive
            });
        } catch (error) {
            console.error(error);
            toast.error('Error al actualizar promoción');
        }
    },

    removePromotion: async (id) => {
        const { deleteDoc } = await import('firebase/firestore');
        try {
            await deleteDoc(doc(db, 'promotions', id));
            toast.success('Promoción eliminada');
        } catch (error) {
            console.error(error);
            toast.error('Error al eliminar promoción');
        }
    },

    deleteSale: async (id) => {
        const { deleteDoc } = await import('firebase/firestore');
        try {
            await deleteDoc(doc(db, 'sales', id));
            toast.success('Venta eliminada');
        } catch (error) {
            console.error(error);
            toast.error('Error al eliminar venta');
        }
    },

    // THE PROMOTION ENGINE 🚀 (Pure Logic, Unchanged)
    calculateCartTotal: (items, globalDiscount, shippingCost = 0) => {
        const promotions = get().promotions.filter(p => p.isActive);
        let appliedPromotions = new Set<string>();
        let subtotal = 0;

        // 1. Calculate items subtotal to start
        items.forEach(item => {
            let itemPrice = item.unitPrice * item.quantity;
            subtotal += itemPrice;
        });

        // 2. Calculate Discounts
        let totalItemDiscounts = 0;

        items.forEach(item => {
            let itemPrice = item.unitPrice * item.quantity;
            let bestItemDiscount = 0;

            promotions.forEach(rule => {
                let applies = false;
                switch (rule.scope) {
                    case 'GLOBAL': applies = true; break;
                    case 'COLLECTION': if (item.collection === rule.target) applies = true; break;
                    case 'TYPE': if (item.type === rule.target) applies = true; break;
                    case 'GENDER': if (item.gender === rule.target) applies = true; break;
                    case 'PRODUCT':
                        if (item.productName && item.productName.includes(rule.target || '')) applies = true;
                        break;
                }

                if (applies) {
                    appliedPromotions.add(rule.id);
                    let val = rule.type === 'PERCENTAGE' ? itemPrice * (rule.value / 100) : rule.value * item.quantity;
                    if (val > bestItemDiscount) bestItemDiscount = val;
                }
            });

            totalItemDiscounts += bestItemDiscount;
        });

        let total = subtotal - totalItemDiscounts - globalDiscount + shippingCost;
        if (total < 0) total = 0;

        return {
            subtotal,
            discountTotal: totalItemDiscounts + globalDiscount,
            shippingCost,
            total,
            appliedPromotions: Array.from(appliedPromotions)
        };
    },

    cleanup: () => {
        set({ sales: [], promotions: [], loading: true, initialized: false });
    }
}));
