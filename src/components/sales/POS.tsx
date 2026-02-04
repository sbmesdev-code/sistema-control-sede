import { useState, useEffect, useMemo } from 'react'
import { Search, ShoppingBag, Tag, Trash2, Plus, Minus, User, Truck, AlertTriangle, Package, Check } from 'lucide-react'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { useInventoryStore } from '../../lib/store'
import { useSalesStore } from '../../lib/salesStore'
import { useSettingsStore } from '../../lib/settingsStore'
import type { SaleItem, Sale, Customer } from '../../types/sales'
import type { Product, ProductVariant } from '../../types/inventory'
import { generateReceipt } from '../../lib/receiptGenerator'
import { toast } from 'sonner'
import { ConfirmDialog } from '../ConfirmDialog'
import { cn } from '../../lib/utils'

// Separate component for performance and cleaner logic
function ProductCard({ product, addToCart, cart }: { product: Product, addToCart: (variant: ProductVariant, product: Product) => void, cart: SaleItem[] }) {
    // Group variants by color
    const variantsByColor = useMemo(() => {
        const groups: Record<string, ProductVariant[]> = {};
        product.variants.forEach(v => {
            const colorKey = v.colorCode || v.color; // Use code or name as key
            if (!groups[colorKey]) groups[colorKey] = [];
            groups[colorKey].push(v);
        });
        return groups;
    }, [product.variants]);

    const colorKeys = Object.keys(variantsByColor);
    const [selectedColorKey, setSelectedColorKey] = useState(colorKeys[0] || '');

    // Update selected color if product changes or variants change
    useEffect(() => {
        if (!colorKeys.includes(selectedColorKey)) {
            setSelectedColorKey(colorKeys[0] || '');
        }
    }, [colorKeys, selectedColorKey]);

    const currentVariants = variantsByColor[selectedColorKey] || [];

    // Find image: Try to find an image in the current color variants, fallback to any product image
    const displayImage = useMemo(() => {
        const variantWithImage = currentVariants.find(v => v.images && v.images.length > 0);
        if (variantWithImage) return variantWithImage.images[0];

        // Fallback to any image
        const anyVariant = product.variants.find(v => v.images && v.images.length > 0);
        return anyVariant?.images[0];
    }, [currentVariants, product.variants]);

    return (
        <div className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg transition-all group flex flex-col h-full">
            {/* Image Area */}
            <div className="aspect-[4/5] w-full bg-muted relative overflow-hidden">
                {displayImage ? (
                    <img
                        src={displayImage}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-accent/30">
                        <Package className="h-12 w-12 opacity-20" />
                    </div>
                )}

                {/* Collection Badge */}
                <div className="absolute top-2 left-2">
                    <span className="text-[10px] uppercase font-bold px-2 py-1 bg-background/90 backdrop-blur-sm text-foreground rounded-md shadow-sm border border-border/50">
                        {product.collection}
                    </span>
                </div>
            </div>

            <div className="p-4 flex flex-col flex-1 gap-3">
                <div>
                    <h4 className="font-bold text-base leading-tight line-clamp-2">{product.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1 font-mono">{product.baseCode}</p>
                </div>

                {/* Color Selector */}
                {colorKeys.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {colorKeys.map(key => {
                            const variant = variantsByColor[key][0];
                            const isSelected = key === selectedColorKey;
                            return (
                                <button
                                    key={key}
                                    onClick={() => setSelectedColorKey(key)}
                                    className={cn(
                                        "w-6 h-6 rounded-full border border-border transition-all relative",
                                        isSelected ? "ring-2 ring-primary ring-offset-2 scale-110" : "hover:scale-110"
                                    )}
                                    title={variant.color}
                                    style={{ backgroundColor: variant.colorCode || '#000000' }} // Fallback if no code
                                >
                                    {key === selectedColorKey && (
                                        <span className="absolute inset-0 flex items-center justify-center">
                                            {/* Optional checkmark for contrast? Usually ring is enough */}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Size Selector (Actions) */}
                <div className="grid grid-cols-4 gap-2 mt-auto">
                    {currentVariants.map(variant => {
                        const inCart = cart.find(i => i.variantId === variant.id)?.quantity || 0;
                        const outOfStock = variant.stock === 0;

                        return (
                            <button
                                key={variant.id}
                                disabled={outOfStock}
                                onClick={() => addToCart(variant, product)}
                                className={cn(
                                    "flex flex-col items-center justify-center py-2 rounded-md border text-center transition-all relative overflow-hidden",
                                    outOfStock
                                        ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50 border-transparent"
                                        : "bg-background hover:border-primary hover:text-primary active:bg-primary/5 border-border"
                                )}
                            >
                                <span className="text-xs font-bold">{variant.size}</span>
                                <span className="text-[10px] text-muted-foreground">S/{variant.priceRetail}</span>

                                {/* In Cart Indicator */}
                                {inCart > 0 && (
                                    <div className="absolute top-0 right-0 w-3 h-3 bg-primary rounded-bl-full shadow-sm" />
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    );
}

export function POS() {
    const products = useInventoryStore(state => state.products)
    const store = useSalesStore()
    const { districts, globalShippingBase } = useSettingsStore()

    // UI State
    const [searchTerm, setSearchTerm] = useState('')
    const [cart, setCart] = useState<SaleItem[]>([])
    const [globalDiscountInput, setGlobalDiscountInput] = useState('')

    // Dialog State
    const [showReceiptDialog, setShowReceiptDialog] = useState(false)
    const [lastSale, setLastSale] = useState<Sale | null>(null)

    // Delivery State
    const [deliveryMethod, setDeliveryMethod] = useState<'PUERTA' | 'ENCUENTRO'>('ENCUENTRO')
    const [districtError, setDistrictError] = useState(false)

    // Customer & Shipping State
    const [customerName, setCustomerName] = useState('')
    const [customerAddress, setCustomerAddress] = useState('')
    const [department, setDepartment] = useState<'LIMA' | 'CALLAO'>('LIMA')
    const [district, setDistrict] = useState('')
    const [shippingCostInput, setShippingCostInput] = useState(globalShippingBase.toString())

    // Derived Data
    const availableDistricts = districts.filter(d => d.department === department);

    // Derived Totals
    const [totals, setTotals] = useState({ subtotal: 0, discountTotal: 0, shippingCost: 0, total: 0, appliedPromotions: [] as string[] })

    // Auto-update shipping cost based on district and method
    useEffect(() => {
        if (deliveryMethod === 'ENCUENTRO') {
            setShippingCostInput('0');
        } else if (deliveryMethod === 'PUERTA' && district) {
            const dConfig = districts.find(d => d.name === district);
            if (dConfig) {
                if (!dConfig.allowDoorDelivery) {
                    setDistrictError(true);
                } else {
                    setDistrictError(false);
                    setShippingCostInput(dConfig.basePrice.toString());
                }
            }
        }
    }, [district, deliveryMethod, districts]);

    // Recalculate totals
    useEffect(() => {
        const globalDisc = parseFloat(globalDiscountInput) || 0;
        const shipping = parseFloat(shippingCostInput) || 0;
        const calcs = store.calculateCartTotal(cart, globalDisc, shipping);
        setTotals(calcs);
    }, [cart, globalDiscountInput, shippingCostInput, store]);

    // Filter products
    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.baseCode.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const addToCart = (variant: ProductVariant, product: Product) => {
        // Stock Validation 🛡️
        const currentInCart = cart.find(i => i.variantId === variant.id)?.quantity || 0;
        if (currentInCart + 1 > variant.stock) {
            toast.error(`¡Stock insuficiente! Solo quedan ${variant.stock} unidades.`);
            return;
        }

        setCart(prev => {
            const existing = prev.find(item => item.variantId === variant.id);
            if (existing) {
                return prev.map(item => item.variantId === variant.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, {
                variantId: variant.id,
                sku: variant.sku,
                productName: product.name,
                collection: product.collection,
                type: product.type,
                gender: product.gender,
                color: variant.color,
                size: variant.size,
                quantity: 1,
                unitPrice: variant.priceRetail,
                discount: 0,
                subtotal: variant.priceRetail
            }]
        });
        toast.success("Agregado al carrito");
    }

    const removeFromCart = (variantId: string) => {
        setCart(prev => prev.filter(item => item.variantId !== variantId));
    }

    const updateQuantity = (variantId: string, delta: number) => {
        if (delta > 0) {
            const item = cart.find(i => i.variantId === variantId);
            const product = products.find(p => p.variants.some(v => v.id === variantId));
            const variant = product?.variants.find(v => v.id === variantId);

            if (item && variant && item.quantity + delta > variant.stock) {
                toast.error(`¡Stock insuficiente! Solo quedan ${variant.stock} unidades.`);
                return;
            }
        }

        setCart(prev => prev.map(item => {
            if (item.variantId === variantId) {
                const newQty = item.quantity + delta;
                return newQty > 0 ? { ...item, quantity: newQty } : item;
            }
            return item;
        }));
    }

    const handleCheckout = async () => {
        if (cart.length === 0) return;

        if (!customerName.trim()) { alert("Nombre del Cliente es obligatorio"); return; }
        if (!customerAddress.trim()) { alert("Dirección de Entrega es obligatoria"); return; }
        if (!district) { alert("Debe seleccionar un Distrito"); return; }

        const customer: Customer = {
            name: customerName,
            address: customerAddress,
            department,
            district
        };

        const newSale: Sale = {
            id: crypto.randomUUID(),
            customer,
            items: cart,
            subtotal: totals.subtotal,
            globalDiscount: totals.discountTotal,
            shippingCost: totals.shippingCost,
            total: totals.total,
            status: 'ADELANTADO',
            paymentStatus: 'PENDIENTE',
            promotionsApplied: totals.appliedPromotions,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        try {
            await store.addSale(newSale); // Wait for Firestore!

            setLastSale(newSale);
            setShowReceiptDialog(true);
            setCart([]);
            setCustomerName('');
            setCustomerAddress('');
            setGlobalDiscountInput('');
            setDistrict('');
        } catch (error) {
            console.error(error);
        }
    }

    return (
        <div className="h-full grid grid-cols-12 gap-6 p-1">
            {/* Left: Product Catalog */}
            <div className="col-span-8 flex flex-col gap-4 h-full">
                <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar producto por nombre..."
                        className="pl-10 h-12 text-lg bg-card rounded-xl shadow-sm border-border/50 focus-visible:ring-primary/20"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex-1 overflow-y-auto pr-2 pb-20">
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredProducts.map(product => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                addToCart={addToCart}
                                cart={cart}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Right: Cart & Checkout */}
            <div className="col-span-4 bg-card border border-border rounded-xl h-full flex flex-col shadow-xl overflow-hidden">
                <div className="p-4 border-b border-border bg-muted/30">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <ShoppingBag className="h-5 w-5" /> Carrito de Venta
                    </h2>
                </div>

                {/* Cart Items List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                            <ShoppingBag className="h-16 w-16 mb-4" />
                            <p>Carrito vacío</p>
                        </div>
                    ) : (
                        cart.map(item => (
                            <div key={item.variantId} className="flex flex-col p-3 bg-accent/20 rounded-lg border border-border/50">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-medium text-sm line-clamp-1">{item.productName}</span>
                                    <span className="font-mono text-xs text-muted-foreground">{item.sku}</span>
                                </div>
                                <div className="flex justify-between items-center mt-2">
                                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full border border-border" style={{ backgroundColor: filteredProducts.find(p => p.variants.some(v => v.id === item.variantId))?.variants.find(v => v.id === item.variantId)?.colorCode || '#ddd' }}></div>
                                        {item.color} / {item.size}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1 bg-background rounded border border-border">
                                            <button onClick={() => updateQuantity(item.variantId, -1)} className="p-1 hover:bg-accent"><Minus className="h-3 w-3" /></button>
                                            <span className="text-xs font-mono w-6 text-center">{item.quantity}</span>
                                            <button onClick={() => updateQuantity(item.variantId, 1)} className="p-1 hover:bg-accent"><Plus className="h-3 w-3" /></button>
                                        </div>
                                        <span className="font-bold text-sm min-w-[3rem] text-right">S/{(item.unitPrice * item.quantity).toFixed(0)}</span>
                                        <button onClick={() => removeFromCart(item.variantId)} className="text-destructive hover:bg-destructive/10 p-1 rounded">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Customer & Shipping Form */}
                <div className="p-4 bg-muted/10 border-t border-border space-y-3 text-sm">
                    {/* ... (Existing Checkout Logic) ... */}
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        <User className="h-3 w-3" /> Datos de Envío (Obligatorios)
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-2 p-1 bg-muted rounded-md border border-border">
                        <button
                            className={`text-xs font-medium py-1.5 rounded-sm transition-all ${deliveryMethod === 'PUERTA' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            onClick={() => setDeliveryMethod('PUERTA')}
                        >
                            A Puerta 🏠
                        </button>
                        <button
                            className={`text-xs font-medium py-1.5 rounded-sm transition-all ${deliveryMethod === 'ENCUENTRO' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            onClick={() => setDeliveryMethod('ENCUENTRO')}
                        >
                            Punto Encuentro 📍
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <select
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none"
                            value={department}
                            onChange={(e) => {
                                setDepartment(e.target.value as 'LIMA' | 'CALLAO');
                                setDistrict('');
                            }}
                        >
                            <option value="LIMA">LIMA</option>
                            <option value="CALLAO">CALLAO</option>
                        </select>
                        <select
                            className={`flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none ${districtError ? 'border-destructive' : ''}`}
                            value={district}
                            onChange={(e) => setDistrict(e.target.value)}
                        >
                            <option value="">Distrito...</option>
                            {availableDistricts.map(d => (
                                <option key={d.name} value={d.name}>
                                    {d.name} {!d.allowDoorDelivery && deliveryMethod === 'PUERTA' ? '(No Cob.)' : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    {deliveryMethod === 'PUERTA' && district && (() => {
                        const distConfig = districts.find(d => d.name === district);
                        if (distConfig && !distConfig.allowDoorDelivery) {
                            return (
                                <div className="text-[10px] text-destructive font-bold bg-destructive/10 p-2 rounded flex items-center gap-2">
                                    <AlertTriangle className="h-3 w-3" />
                                    No hay cobertura a puerta en {district}.
                                </div>
                            )
                        }
                        return null;
                    })()}

                    <Input
                        placeholder={deliveryMethod === 'PUERTA' ? "Dirección Exacta *" : "Punto de Encuentro (Estación, CC...) *"}
                        value={customerAddress}
                        onChange={e => setCustomerAddress(e.target.value)}
                        className="bg-background h-9"
                    />

                    <Input
                        placeholder="Nombre Completo *"
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        className="bg-background h-9"
                    />
                </div>

                {/* Totals & Actions */}
                <div className="p-6 bg-card border-t-2 border-primary/20 space-y-3 shadow-inner">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="relative">
                            <Tag className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Desc. Global"
                                className="bg-background pl-9 h-9"
                                type="number"
                                value={globalDiscountInput}
                                onChange={(e) => setGlobalDiscountInput(e.target.value)}
                            />
                        </div>
                        <div className="relative">
                            <Truck className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Envío"
                                className="bg-background pl-9 h-9"
                                type="number"
                                value={shippingCostInput}
                                onChange={(e) => setShippingCostInput(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-1 text-sm pt-2">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span>S/ {totals.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                            <span>Envío</span>
                            <span>+S/ {totals.shippingCost.toFixed(2)}</span>
                        </div>
                        {totals.discountTotal > 0 && (
                            <div className="flex justify-between text-emerald-600 font-medium">
                                <span>Descuentos {totals.appliedPromotions.length > 0 && `(${totals.appliedPromotions.length} reglas)`}</span>
                                <span>-S/ {totals.discountTotal.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-xl font-black pt-2 border-t border-border mt-2">
                            <span>Total</span>
                            <span>S/ {totals.total.toFixed(2)}</span>
                        </div>
                    </div>

                    <Button
                        size="lg"
                        className="w-full shadow-lg shadow-primary/20 text-lg h-12"
                        onClick={handleCheckout}
                        disabled={cart.length === 0}
                    >
                        Cobrar S/ {totals.total.toFixed(2)}
                    </Button>
                </div>
            </div>

            <ConfirmDialog
                isOpen={showReceiptDialog}
                onClose={() => setShowReceiptDialog(false)}
                onConfirm={() => {
                    if (lastSale) {
                        try {
                            generateReceipt(lastSale);
                            toast.success("Boleta generada correctamente");
                        } catch (error) {
                            console.error(error);
                            toast.error("Error al generar la boleta");
                        }
                    }
                }}
                title="Venta Registrada Exitosamente"
                message="¿Desea generar y descargar la boleta de venta ahora?"
                confirmText="Sí, Generar Boleta"
                cancelText="No por ahora"
                variant="success"
            />
        </div>
    )
}
