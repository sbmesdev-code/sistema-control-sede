import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Sale, SaleItem, PromotionRule } from '../types/sales'

interface SalesState {
    sales: Sale[];
    promotions: PromotionRule[];

    // Actions
    addSale: (sale: Sale) => void;
    updateSaleStatus: (id: string, status: Sale['status']) => void;
    addPromotion: (rule: PromotionRule) => void;
    togglePromotion: (id: string) => void;
    removePromotion: (id: string) => void;

    // Logic
    calculateCartTotal: (items: SaleItem[], globalDiscount: number, shippingCost?: number) => { subtotal: number, discountTotal: number, shippingCost: number, total: number, appliedPromotions: string[] };
}

// Initial Mock Promotions
const INITIAL_PROMOTIONS: PromotionRule[] = [
    { id: '1', name: 'Liquidación Verano', type: 'PERCENTAGE', value: 20, scope: 'COLLECTION', target: 'VERANO', isActive: true },
    { id: '2', name: 'Descuento Polos', type: 'FIXED_AMOUNT', value: 5, scope: 'TYPE', target: 'POLO', isActive: true },
];

export const useSalesStore = create<SalesState>()(
    persist(
        (set, get) => ({
            sales: [],
            promotions: INITIAL_PROMOTIONS,

            addSale: (sale) => set((state) => ({ sales: [sale, ...state.sales] })),

            updateSaleStatus: (id, status) => set((state) => ({
                sales: state.sales.map(s => s.id === id ? {
                    ...s, status, updatedAt: Date.now()
                } : s)
            })),

            addPromotion: (rule) => set((state) => ({ promotions: [...state.promotions, rule] })),

            togglePromotion: (id) => set((state) => ({
                promotions: state.promotions.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p)
            })),

            removePromotion: (id) => set((state) => ({
                promotions: state.promotions.filter(p => p.id !== id)
            })),

            // THE PROMOTION ENGINE 🚀
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
            }
        }),
        {
            name: 'scs-sales-storage',
        }
    )
)
