import { useState, useEffect } from 'react'
import { Plus, Search, Filter, MoreHorizontal, ArrowUpDown, Package } from 'lucide-react'
import { useInventoryStore } from '../../lib/store'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { cn } from '../../lib/utils'
import type { Product } from '../../types/inventory'

interface InventoryListProps {
    onAddProduct: () => void;
    onEditProduct: (product: Product) => void;
}

// Helper component for interactive margin
function MarginDisplay({ cost, price }: { cost: number, price: number }) {
    const [showPercentage, setShowPercentage] = useState(true);

    if (price === 0) return <span className="text-muted-foreground">-</span>;

    const profit = price - cost;
    const marginPercent = ((profit / price) * 100).toFixed(1);
    const isNegative = profit < 0;

    return (
        <button
            type="button"
            onClick={(e) => {
                e.stopPropagation(); // Prevent row toggle
                setShowPercentage(!showPercentage);
            }}
            className={cn(
                "px-2 py-1 rounded text-xs font-bold transition-all w-20 text-center cursor-pointer",
                isNegative
                    ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                    : "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
            )}
            title="Clic para cambiar entre % y S/"
        >
            {showPercentage ? `${marginPercent}%` : (profit > 0 ? `+S/ ${profit.toFixed(2)}` : `S/ ${profit.toFixed(2)}`)}
        </button>
    )
}

import { ConfirmDialog } from '../ConfirmDialog'

export function InventoryList({ onAddProduct, onEditProduct }: InventoryListProps) {
    const products = useInventoryStore(state => state.products)
    const removeProduct = useInventoryStore(state => state.removeProduct)
    const [searchTerm, setSearchTerm] = useState('')
    const [expandedRows, setExpandedRows] = useState<string[]>([])

    // Delete State
    const [productToDelete, setProductToDelete] = useState<string | null>(null)

    // Simple filtering
    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.baseCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.collection.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const toggleRow = (id: string) => {
        setExpandedRows(prev =>
            prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
        )
    }

    const handleDeleteConfirm = async () => {
        if (productToDelete) {
            await removeProduct(productToDelete);
            setProductToDelete(null);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Inventario Global</h2>
                    <p className="text-muted-foreground mt-1">Gestiona el catálogo de productos, existencias y precios.</p>
                </div>
                <Button onClick={onAddProduct} size="lg" className="shadow-lg shadow-primary/20">
                    <Plus className="mr-2 h-5 w-5" /> Nuevo Producto
                </Button>
            </div>

            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                {/* Table Toolbar */}
                <div className="p-4 border-b border-border flex items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nombre, SKU o colección..."
                            className="pl-9 bg-background/50"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="h-9" onClick={() => alert("Funcionalidad de filtros avanzada pendiente")}>
                            <Filter className="mr-2 h-4 w-4" /> Filtros
                        </Button>
                        <Button variant="outline" size="sm" className="h-9" onClick={() => alert("Funcionalidad de ordenar pendiente")}>
                            <ArrowUpDown className="mr-2 h-4 w-4" /> Ordenar
                        </Button>
                    </div>
                </div>

                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 p-4 bg-muted/30 border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground items-center">
                    <div className="col-span-4 pl-2">Producto</div>
                    <div className="col-span-2">SKU Base</div>
                    <div className="col-span-1">Colección</div>
                    <div className="col-span-2 text-center">Rango Precios</div>
                    <div className="col-span-1 text-center">Margen Prom.</div>
                    <div className="col-span-1 text-center">Stock</div>
                    <div className="col-span-1 text-right">Acciones</div>
                </div>

                {/* Table Body */}
                <div className="divide-y divide-border">
                    {filteredProducts.length === 0 ? (
                        <div className="p-12 text-center text-muted-foreground">
                            No se encontraron productos que coincidan con tu búsqueda.
                        </div>
                    ) : (
                        filteredProducts.map((product) => {
                            const totalStock = product.variants.reduce((acc, v) => acc + v.stock, 0);
                            const minPrice = Math.min(...product.variants.map(v => v.priceRetail));
                            const maxPrice = Math.max(...product.variants.map(v => v.priceRetail));
                            const priceDisplay = minPrice === maxPrice ? `S/ ${minPrice}` : `S/ ${minPrice} - S/ ${maxPrice}`;
                            const isExpanded = expandedRows.includes(product.id);

                            // Simple average for main row margin display
                            const avgCost = product.variants.reduce((acc, v) => acc + v.priceProduction, 0) / (product.variants.length || 1);
                            const avgPrice = product.variants.reduce((acc, v) => acc + v.priceRetail, 0) / (product.variants.length || 1);

                            return (
                                <div key={product.id} className="group transition-colors hover:bg-accent/5">
                                    {/* Main Row */}
                                    <div className="grid grid-cols-12 gap-4 p-4 items-center cursor-pointer" onClick={() => toggleRow(product.id)}>
                                        <div className="col-span-4 flex items-center gap-4">
                                            {/* Slideshow Image Preview */}
                                            <div className="h-16 w-16 rounded-md bg-muted border border-border overflow-hidden flex-shrink-0 relative shadow-sm">
                                                {(() => {
                                                    const allImages = product.variants.flatMap(v => v.images || []);
                                                    if (allImages.length === 0) {
                                                        return (
                                                            <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                                                                <Package className="h-5 w-5 opacity-20" />
                                                            </div>
                                                        );
                                                    }

                                                    // eslint-disable-next-line react-hooks/rules-of-hooks
                                                    const [currentIdx, setCurrentIdx] = useState(0);

                                                    // eslint-disable-next-line react-hooks/rules-of-hooks
                                                    useEffect(() => {
                                                        if (allImages.length <= 1) return;
                                                        const interval = setInterval(() => {
                                                            setCurrentIdx(prev => (prev + 1) % allImages.length);
                                                        }, 2000);
                                                        return () => clearInterval(interval);
                                                    }, [allImages.length]);

                                                    return (
                                                        <img
                                                            src={allImages[currentIdx]}
                                                            alt={product.name}
                                                            className="h-full w-full object-cover transition-opacity duration-300"
                                                        />
                                                    );
                                                })()}
                                            </div>
                                            <div>
                                                <div className="font-medium text-foreground">{product.name}</div>
                                                <div className="text-xs text-muted-foreground">{product.type} • {product.gender}</div>
                                            </div>
                                        </div>

                                        <div className="col-span-2">
                                            <code className="text-xs font-mono bg-accent px-1.5 py-0.5 rounded text-primary">{product.baseCode}</code>
                                        </div>

                                        <div className="col-span-1">
                                            <span className="text-xs font-medium px-2 py-1 rounded-full bg-secondary text-secondary-foreground border border-secondary-foreground/10">
                                                {product.collection}
                                            </span>
                                        </div>

                                        <div className="col-span-2 text-center text-sm font-medium">
                                            {product.variants.length > 0 ? priceDisplay : <span className="text-muted-foreground">-</span>}
                                        </div>

                                        <div className="col-span-1 text-center flex justify-center">
                                            {product.variants.length > 0 ? (
                                                <MarginDisplay cost={avgCost} price={avgPrice} />
                                            ) : '-'}
                                        </div>

                                        <div className="col-span-1 text-center">
                                            <span className={cn(
                                                "text-sm font-bold",
                                                totalStock === 0 ? "text-destructive" : totalStock < 10 ? "text-yellow-600" : "text-green-600"
                                            )}>
                                                {totalStock}
                                            </span>
                                        </div>

                                        <div className="col-span-1 flex justify-end">
                                            <Button
                                                variant={isExpanded ? "secondary" : "ghost"}
                                                size="sm"
                                                className="h-8 w-8 p-0"
                                                onClick={(e) => { e.stopPropagation(); toggleRow(product.id); }}
                                            >
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {isExpanded && (
                                        <div className="bg-muted/20 border-t border-border p-4 pl-12 cursor-default" onClick={(e) => e.stopPropagation()}>
                                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Detalle de Variantes</h4>
                                            <div className="border border-border rounded-lg overflow-hidden bg-background shadow-sm">
                                                <table className="w-full text-sm text-left">
                                                    <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
                                                        <tr>
                                                            <th className="px-4 py-2 font-medium w-16">Img</th>
                                                            <th className="px-4 py-2 font-medium">SKU Variante</th>
                                                            <th className="px-4 py-2 font-medium">Color / Talla</th>
                                                            <th className="px-4 py-2 font-medium text-right">Costo Prod.</th>
                                                            <th className="px-4 py-2 font-medium text-right">Precio Venta</th>
                                                            <th className="px-4 py-2 font-medium text-center">Margen</th>
                                                            <th className="px-4 py-2 font-medium text-right">Stock</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-border">
                                                        {product.variants.map((variant) => (
                                                            <tr key={variant.id} className="hover:bg-accent/5">
                                                                <td className="px-4 py-2">
                                                                    {variant.images && variant.images.length > 0 ? (
                                                                        <img src={variant.images[0]} alt="" className="w-8 h-8 rounded object-cover border border-border" />
                                                                    ) : (
                                                                        <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-[10px] text-muted-foreground">
                                                                            -
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{variant.sku}</td>
                                                                <td className="px-4 py-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-medium">{variant.color}</span>
                                                                        <span className="bg-accent px-1.5 py-0.5 rounded text-[10px] font-mono">{variant.size}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-2 text-right text-muted-foreground">S/ {variant.priceProduction.toFixed(2)}</td>
                                                                <td className="px-4 py-2 text-right font-medium">S/ {variant.priceRetail.toFixed(2)}</td>
                                                                <td className="px-4 py-2 flex justify-center">
                                                                    <MarginDisplay cost={variant.priceProduction} price={variant.priceRetail} />
                                                                </td>
                                                                <td className="px-4 py-2 text-right font-bold">{variant.stock}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div className="mt-4 flex justify-end gap-2">
                                                <Button size="sm" variant="outline" onClick={() => onEditProduct(product)}>Editar Producto</Button>
                                                <Button size="sm" variant="destructive" onClick={() => setProductToDelete(product.id)}>Eliminar</Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })
                    )}
                </div>
            </div>

            <ConfirmDialog
                isOpen={!!productToDelete}
                onClose={() => setProductToDelete(null)}
                onConfirm={handleDeleteConfirm}
                title="Eliminar Producto"
                message="¿Estás seguro de que deseas eliminar este producto y todas sus variantes? Esta acción no se puede deshacer."
                confirmText="Sí, Eliminar"
                variant="danger"
            />
        </div>
    )
}
