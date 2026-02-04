export type CollectionType = string;
export type Gender = 'HOMBRE' | 'MUJER' | 'UNISEX';
export type ProductStatus = 'ACTIVO' | 'DESCATALOGADO';

export interface ProductVariant {
    id: string; // UUID
    sku: string; // Generated SKU
    color: string;
    colorCode?: string; // Hex code for UI
    size: string;
    stock: number;
    priceProduction: number;
    priceRetail: number;
    images: string[];
}

export interface Product {
    id: string; // UUID (Base ID)
    name: string;
    description?: string;
    collection: CollectionType;
    type: string; // e.g., "POLO", "PANTALON"
    gender: Gender;
    baseCode: string; // Part of SKU common to all variants
    variants: ProductVariant[];
    createdAt: number;
    updatedAt: number;
}


// Interfaces for form state
export interface ProductFormData {
    name: string;
    collection: CollectionType;
    type: string;
    gender: Gender;
    variants: {
        id?: string;
        color: string;
        colorCode?: string;
        size: string;
        priceProduction: number;
        priceRetail: number;
        stock: number;
        images: (File | string)[];
    }[];
}
