import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product } from '../types/inventory'

// Mock initial data
const INITIAL_PRODUCTS: Product[] = [
    {
        id: '1',
        name: 'Polo Básico Oversize',
        collection: 'VERANO',
        type: 'POLO',
        gender: 'UNISEX',
        baseCode: 'VER-POL-U-PBO',
        updatedAt: Date.now(),
        createdAt: Date.now(),
        variants: [
            { id: '1-1', sku: 'VER-POL-U-PBO-BLK-M', color: 'Negro', size: 'M', stock: 15, priceProduction: 10, priceRetail: 25, images: [] },
            { id: '1-2', sku: 'VER-POL-U-PBO-WHT-L', color: 'Blanco', size: 'L', stock: 8, priceProduction: 10, priceRetail: 25, images: [] },
        ]
    },
    {
        id: '2',
        name: 'Casaca Denim Vintage',
        collection: 'INVIERNO',
        type: 'CASACA',
        gender: 'HOMBRE',
        baseCode: 'INV-CAS-H-CDV',
        updatedAt: Date.now(),
        createdAt: Date.now(),
        variants: [
            { id: '2-1', sku: 'INV-CAS-H-CDV-BLU-L', color: 'Azul', size: 'L', stock: 5, priceProduction: 45, priceRetail: 120, images: [] },
        ]
    }
];

interface InventoryState {
    products: Product[];
    addProduct: (product: Product) => void;
    updateProduct: (id: string, product: Partial<Product>) => void;
    removeProduct: (id: string) => void;
}

export const useInventoryStore = create<InventoryState>()(
    persist(
        (set) => ({
            products: INITIAL_PRODUCTS,
            addProduct: (product) => set((state) => ({ products: [...state.products, product] })),
            updateProduct: (id, updatedData) => set((state) => ({
                products: state.products.map(p => p.id === id ? { ...p, ...updatedData, updatedAt: Date.now() } : p)
            })),
            removeProduct: (id) => set((state) => ({ products: state.products.filter(p => p.id !== id) })),
        }),
        {
            name: 'scs-inventory-storage',
        }
    )
)
