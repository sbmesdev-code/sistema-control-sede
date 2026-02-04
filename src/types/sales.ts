export type SaleStatus = 'ADELANTADO' | 'COMPLETO' | 'ENTREGADO' | 'CANCELADO';
export type PaymentStatus = 'PENDIENTE' | 'PAGADO';

export interface Customer {
    name: string;
    address: string;
    phone?: string;
    department?: 'LIMA' | 'CALLAO';
    district?: string;
    reference?: string;
}

export interface SaleItem {
    variantId: string;
    sku: string;
    productName: string;
    // Snapshot of product metadata for promotions
    collection: string;
    type: string;
    gender: string;
    // Variant details
    color: string;
    size: string;
    quantity: number;
    unitPrice: number; // Price at time of sale
    discount: number; // Discount applied to this line item
    subtotal: number; // (unitPrice * quantity) - discount
}

export type PromotionScope = 'GLOBAL' | 'COLLECTION' | 'TYPE' | 'GENDER' | 'PRODUCT' | 'VARIANT';
export type PromotionType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export interface PromotionRule {
    id: string;
    name: string;
    type: PromotionType;
    value: number;
    scope: PromotionScope;
    target?: string;
    isActive: boolean;
}

export interface Sale {
    id: string;
    customer: Customer;
    items: SaleItem[];

    // Financials
    subtotal: number;
    globalDiscount: number;
    shippingCost: number;
    total: number;

    // Status
    status: SaleStatus;
    paymentStatus: PaymentStatus;

    // Discounts tracking
    promotionsApplied: string[];

    // Dates
    createdAt: number;
    updatedAt: number;
    deliveryDate?: number;
}
