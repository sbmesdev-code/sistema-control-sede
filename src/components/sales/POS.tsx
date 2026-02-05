import { useState, useEffect, useMemo } from 'react'
import { Search, ShoppingBag, Plus, Minus, Truck, MapPin, CreditCard, X, PackageOpen, ArrowLeft, ArrowRight } from 'lucide-react'
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
import { AnimatePresence, motion } from 'framer-motion'

// Separate component for performance and cleaner logic
function ProductCard({ product, addToCart, cart }: { product: Product, addToCart: (variant: ProductVariant, product: Product) => void, cart: SaleItem[] }) {
    // Group variants by color
    const variantsByColor = useMemo(() => {
        const groups: Record<string, ProductVariant[]> = {};
        product.variants.forEach(v => {
            const colorKey = v.colorCode || v.color;
            if (!groups[colorKey]) groups[colorKey] = [];
            groups[colorKey].push(v);
        });
        return groups;
    }, [product.variants]);

    const colorKeys = Object.keys(variantsByColor);
    const [selectedColorKey, setSelectedColorKey] = useState(colorKeys[0] || '');

    useEffect(() => {
        if (!colorKeys.includes(selectedColorKey)) {
            setSelectedColorKey(colorKeys[0] || '');
        }
    }, [colorKeys, selectedColorKey]);

    const currentVariants = variantsByColor[selectedColorKey] || [];

    const displayImage = useMemo(() => {
        const variantWithImage = currentVariants.find(v => v.images && v.images.length > 0);
        if (variantWithImage) return variantWithImage.images[0];
        return undefined;
    }, [currentVariants]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group flex flex-col h-full bg-card rounded-2xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
        >
            {/* Image Area */}
            <div
                className="aspect-[4/5] w-full bg-muted/30 relative overflow-hidden cursor-pointer active:scale-95 transition-transform"
                onClick={() => {
                    const availableVariant = currentVariants.find(v => v.stock > 0);
                    if (availableVariant) {
                        addToCart(availableVariant, product);
                    } else {
                        toast.error("No hay stock disponible en este color");
                    }
                }}
            >
                {displayImage ? (
                    <img
                        src={displayImage}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                        <PackageOpen className="h-12 w-12" />
                    </div>
                )}

                <div className="absolute top-3 left-3 flex gap-2 pointer-events-none">
                    <span className="text-[10px] font-bold px-2.5 py-1 bg-background/80 backdrop-blur-md text-foreground rounded-full shadow-sm border border-white/20">
                        {product.collection}
                    </span>
                </div>
            </div>

            <div className="p-4 flex flex-col flex-1 gap-3">
                <div>
                    <div className="flex justify-between items-start gap-2">
                        <h4 className="font-bold text-sm leading-snug line-clamp-2 min-h-[2.5rem]">{product.name}</h4>
                        <span className="font-black text-lg text-primary shrink-0">
                            S/ {currentVariants[0]?.priceRetail || product.variants[0]?.priceRetail || 0}
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{product.baseCode}</p>
                </div>

                {/* Color Selector */}
                {colorKeys.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {colorKeys.map(key => {
                            const variant = variantsByColor[key][0];
                            const isSelected = key === selectedColorKey;
                            return (
                                <button
                                    key={key}
                                    onClick={() => setSelectedColorKey(key)}
                                    className={cn(
                                        "w-5 h-5 rounded-full shadow-sm border border-border transition-all",
                                        isSelected ? "ring-2 ring-primary ring-offset-2 scale-110" : "hover:scale-110 opacity-70 hover:opacity-100"
                                    )}
                                    title={variant.color}
                                    style={{ backgroundColor: variant.colorCode || '#000000' }}
                                />
                            );
                        })}
                    </div>
                )}

                {/* Size Selector */}
                <div className="grid grid-cols-4 gap-1.5 mt-auto">
                    {currentVariants.map(variant => {
                        const inCart = cart.find(i => i.variantId === variant.id)?.quantity || 0;
                        const outOfStock = variant.stock === 0;

                        return (
                            <button
                                key={variant.id}
                                disabled={outOfStock}
                                onClick={() => addToCart(variant, product)}
                                className={cn(
                                    "relative flex flex-col items-center justify-center py-1.5 rounded-lg border text-center transition-all px-0",
                                    outOfStock
                                        ? "bg-muted/50 text-muted-foreground/50 cursor-not-allowed border-transparent"
                                        : "bg-background hover:border-primary hover:bg-primary/5 active:scale-95 border-border"
                                )}
                            >
                                <span className="text-xs font-bold">{variant.size}</span>
                                {inCart > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-sm">
                                        {inCart}
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>
        </motion.div>
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
    const [checkoutStep, setCheckoutStep] = useState<'CART' | 'DETAILS'>('CART')

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

    const availableDistricts = districts.filter(d => d.department === department);

    const [totals, setTotals] = useState({ subtotal: 0, discountTotal: 0, shippingCost: 0, total: 0, appliedPromotions: [] as string[] })

    useEffect(() => {
        if (district) {
            const dConfig = districts.find(d => d.name === district);
            if (dConfig) {
                setShippingCostInput(dConfig.basePrice.toString());

                // Optional: Validate door delivery if needed, but primarily set price
                if (deliveryMethod === 'PUERTA' && !dConfig.allowDoorDelivery) {
                    setDistrictError(true);
                } else {
                    setDistrictError(false);
                }
            }
        } else {
            // Default or reset if no district selected? 
            // Maybe keep previous value or set to global base.
            // For now, let's leave it as is or set to 0 if 'ENCUENTRO' was intended to be cheap but user wants dynamic.
            // If no district, maybe we shouldn't zero it out immediately to allow manual entry, 
            // but the prompt implies "automático tras seleccionar".
        }
    }, [district, deliveryMethod, districts]);

    useEffect(() => {
        const globalDisc = parseFloat(globalDiscountInput) || 0;
        const shipping = parseFloat(shippingCostInput) || 0;
        const calcs = store.calculateCartTotal(cart, globalDisc, shipping);
        setTotals(calcs);
    }, [cart, globalDiscountInput, shippingCostInput, store]);

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.baseCode.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const addToCart = (variant: ProductVariant, product: Product) => {
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
                toast.error(`Stock máximo alcanzado (${variant.stock})`);
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
        if (!customerName.trim()) { toast.error("Nombre del Cliente es obligatorio"); return; }
        if (!customerAddress.trim()) { toast.error("Dirección es obligatoria"); return; }
        if (!district) { toast.error("Distrito es obligatorio"); return; }

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
            await store.addSale(newSale);
            setLastSale(newSale);
            setShowReceiptDialog(true);
            setCart([]);
            setCheckoutStep('CART'); // Reset view
            setCustomerName('');
            setCustomerAddress('');
            setGlobalDiscountInput('');
            setDistrict('');
        } catch (error) {
            console.error(error);
        }
    }

    return (
        <div className="h-full flex flex-row overflow-hidden bg-background">
            {/* Left: Product Catalog */}
            <div className="flex-1 flex flex-col min-w-0 bg-muted/10 h-full overflow-hidden">
                {/* Search Bar */}
                <div className="flex-none p-6 pb-2">
                    <div className="relative max-w-2xl mx-auto w-full">
                        <Search className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground pointer-events-none" />
                        <Input
                            placeholder="Buscar producto por nombre, código..."
                            className="pl-12 h-12 text-lg rounded-2xl border-border/50 bg-background shadow-sm hover:shadow-md transition-shadow focus-visible:ring-primary/20"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto p-6 pt-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-6 pb-20 max-w-7xl mx-auto">
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

            {/* Right: Cart Panel */}
            <div className="w-[380px] xl:w-[420px] 2xl:w-[450px] flex-none border-l border-border/60 bg-card h-full flex flex-col shadow-2xl z-20 transition-all duration-300">

                {/* Header */}
                <div className="p-4 border-b border-border/50 flex items-center justify-between bg-background/50 backdrop-blur-sm shadow-sm z-10 shrink-0 h-[60px]">
                    {checkoutStep === 'CART' ? (
                        <>
                            <h2 className="font-bold flex items-center gap-2 text-base">
                                <ShoppingBag className="h-4 w-4 text-primary" />
                                Carrito
                                <span className="text-[10px] font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border/50">
                                    {cart.length} items
                                </span>
                            </h2>
                            {cart.length > 0 && (
                                <Button variant="ghost" size="sm" onClick={() => setCart([])} className="text-destructive hover:bg-destructive/10 h-7 px-2 text-xs rounded-full">
                                    Limpiar
                                </Button>
                            )}
                        </>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setCheckoutStep('CART')}
                                className="h-8 w-8 p-0 rounded-full hover:bg-muted"
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <h2 className="font-bold text-base">Datos de Venta</h2>
                        </div>
                    )}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
                    <AnimatePresence mode="wait">
                        {checkoutStep === 'CART' ? (
                            <motion.div
                                key="cart-list"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                                className="p-3 space-y-2.5 absolute inset-0 overflow-y-auto"
                            >
                                {cart.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground/40 gap-4 min-h-[400px]">
                                        <div className="p-4 bg-muted/20 rounded-full">
                                            <ShoppingBag className="h-12 w-12 opacity-20" />
                                        </div>
                                        <p className="text-sm font-medium">El carrito está vacío</p>
                                    </div>
                                ) : (
                                    cart.map(item => (
                                        <div
                                            key={`${item.variantId}-${item.quantity}`}
                                            className="flex gap-3 p-2.5 bg-card rounded-xl border border-border/40 hover:border-primary/20 hover:shadow-sm transition-all group"
                                        >
                                            {/* Thumbnail */}
                                            <div className="h-14 w-10 bg-muted/50 rounded-lg overflow-hidden flex-none border border-border/20 shadow-inner relative">
                                                {(() => {
                                                    const product = products.find(p => p.variants.some(v => v.id === item.variantId));
                                                    const variant = product?.variants.find(v => v.id === item.variantId);
                                                    const image = variant?.images?.[0];

                                                    if (image) {
                                                        return (
                                                            <img
                                                                src={image}
                                                                alt={item.productName}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        );
                                                    } else {
                                                        return (
                                                            <div
                                                                className="w-full h-full"
                                                                style={{ backgroundColor: variant?.colorCode || '#ddd' }}
                                                            />
                                                        );
                                                    }
                                                })()}
                                            </div>

                                            <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                                                <div>
                                                    <div className="flex justify-between items-start gap-1">
                                                        <span className="font-medium text-sm truncate text-foreground/90">{item.productName}</span>
                                                        <button
                                                            onClick={() => removeFromCart(item.variantId)}
                                                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-0.5 rounded-md hover:bg-destructive/10"
                                                        >
                                                            <X className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                                                        <span className="bg-muted/50 px-1.5 py-0.5 rounded text-foreground/70 font-medium">{item.size}</span>
                                                        <span>{item.color}</span>
                                                    </div>
                                                </div>

                                                <div className="flex justify-between items-end mt-1.5">
                                                    <div className="flex items-center gap-1 bg-muted/30 rounded-lg border border-border/30 p-0.5 shadow-sm">
                                                        <button onClick={() => updateQuantity(item.variantId, -1)} className="p-1 hover:bg-background rounded-md transition-colors"><Minus className="h-2.5 w-2.5" /></button>
                                                        <span className="text-xs font-mono font-medium w-5 text-center">{item.quantity}</span>
                                                        <button onClick={() => updateQuantity(item.variantId, 1)} className="p-1 hover:bg-background rounded-md transition-colors"><Plus className="h-2.5 w-2.5" /></button>
                                                    </div>
                                                    <span className="font-bold text-sm text-primary">S/ {(item.unitPrice * item.quantity).toFixed(0)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="checkout-details"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.2 }}
                                className="p-4 space-y-6 absolute inset-0 overflow-y-auto"
                            >
                                {/* Delivery Section */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                        <Truck className="w-3 h-3" /> Método de Entrega
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => setDeliveryMethod('ENCUENTRO')}
                                            className={cn("h-20 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2",
                                                deliveryMethod === 'ENCUENTRO' ? "border-primary bg-primary/5 text-primary" : "border-border bg-card hover:border-primary/50 hover:bg-muted/50"
                                            )}
                                        >
                                            <MapPin className="w-6 h-6 mb-1" />
                                            <span className="text-xs font-bold">Punto Encuentro</span>
                                        </button>
                                        <button
                                            onClick={() => setDeliveryMethod('PUERTA')}
                                            className={cn("h-20 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2",
                                                deliveryMethod === 'PUERTA' ? "border-primary bg-primary/5 text-primary" : "border-border bg-card hover:border-primary/50 hover:bg-muted/50"
                                            )}
                                        >
                                            <Truck className="w-6 h-6 mb-1" />
                                            <span className="text-xs font-bold">A Puerta</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Address Section */}
                                <div className="space-y-3 bg-muted/10 p-4 rounded-xl border border-border/50">
                                    <h3 className="text-sm font-semibold">Datos de Cliente</h3>

                                    <div className="space-y-3">
                                        <div className="grid grid-cols-1 gap-2">
                                            <label className="text-[10px] font-medium text-muted-foreground uppercase">Nombre Completo</label>
                                            <Input
                                                placeholder="Ej. Juan Pérez"
                                                value={customerName}
                                                onChange={e => setCustomerName(e.target.value)}
                                                className="bg-background"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-[10px] font-medium text-muted-foreground uppercase">Departamento</label>
                                                <select
                                                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                                    value={department}
                                                    onChange={(e) => { setDepartment(e.target.value as any); setDistrict(''); }}
                                                >
                                                    <option value="LIMA">Lima</option>
                                                    <option value="CALLAO">Callao</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-medium text-muted-foreground uppercase">Distrito</label>
                                                <select
                                                    className={cn("w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                                                        districtError && "border-destructive text-destructive")}
                                                    value={district}
                                                    onChange={(e) => setDistrict(e.target.value)}
                                                >
                                                    <option value="">Seleccionar...</option>
                                                    {availableDistricts.map(d => (
                                                        <option key={d.name} value={d.name}>{d.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-2">
                                            <label className="text-[10px] font-medium text-muted-foreground uppercase">
                                                {deliveryMethod === 'PUERTA' ? "Dirección de Entrega" : "Punto de Encuentro"}
                                            </label>
                                            <Input
                                                placeholder={deliveryMethod === 'PUERTA' ? "Av. Principal 123..." : "Ej. Estación Central..."}
                                                value={customerAddress}
                                                onChange={e => setCustomerAddress(e.target.value)}
                                                className="bg-background"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Financials Section */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-medium text-muted-foreground">Costo de Envío (S/)</label>
                                        <input
                                            className="w-20 text-right bg-muted/30 border border-border rounded-md px-2 py-1 text-sm focus:outline-none focus:border-primary"
                                            value={shippingCostInput}
                                            onChange={e => setShippingCostInput(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-medium text-muted-foreground">Descuento Global (S/)</label>
                                        <input
                                            className="w-20 text-right bg-muted/30 border border-border rounded-md px-2 py-1 text-sm focus:outline-none focus:border-primary"
                                            value={globalDiscountInput}
                                            onChange={e => setGlobalDiscountInput(e.target.value)}
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer Actions */}
                <div className="flex-none p-4 bg-card border-t border-border shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.05)] z-30 shrink-0">
                    <div className="space-y-3">
                        <div className="flex justify-between items-baseline">
                            <span className="text-sm font-medium text-muted-foreground">Total a Pagar</span>
                            <span className="font-black text-2xl text-primary">S/ {totals.total.toFixed(2)}</span>
                        </div>

                        {checkoutStep === 'CART' ? (
                            <Button
                                size="lg"
                                className="w-full font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
                                onClick={() => {
                                    if (cart.length > 0) setCheckoutStep('DETAILS');
                                    else toast.error("El carrito está vacío");
                                }}
                                disabled={cart.length === 0}
                            >
                                Continuar Compra
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        ) : (
                            <Button
                                size="lg"
                                className="w-full font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={handleCheckout}
                            >
                                <CreditCard className="w-4 h-4 mr-2" />
                                Confirmar Venta
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <ConfirmDialog
                isOpen={showReceiptDialog}
                onClose={() => setShowReceiptDialog(false)}
                onConfirm={() => {
                    if (lastSale) {
                        try {
                            generateReceipt(lastSale);
                            toast.success("Boleta generada");
                        } catch (error) {
                            console.error(error);
                            toast.error("Error al generar PDF");
                        }
                    }
                }}
                title="¡Venta Exitosa!"
                message={`Se registró la venta por S/ ${lastSale?.total.toFixed(2)}. ¿Deseas imprimir el comprobante?`}
                confirmText="Sí, Imprimir"
                cancelText="Cerrar"
                variant="success"
            />
        </div>
    )
}
