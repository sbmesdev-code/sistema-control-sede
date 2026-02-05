import { useState, useMemo } from 'react'
import { FileText, Search, Filter, Clock, CheckCircle, Trash2, XCircle } from 'lucide-react'
import { useSalesStore } from '../../lib/salesStore'
import { Input } from '../ui/input'
import { generateReceipt } from '../../lib/receiptGenerator'
import type { SaleStatus } from '../../types/sales'
import { cn } from '../../lib/utils'
import { ConfirmDialog } from '../ConfirmDialog'
import { motion, AnimatePresence } from 'framer-motion'

export function SalesList() {
    const { sales, updateSaleStatus, deleteSale } = useSalesStore()
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState<SaleStatus | 'ALL'>('ALL')

    // Deletion State
    const [saleToDelete, setSaleToDelete] = useState<string | null>(null)

    const filteredSales = useMemo(() => {
        return sales.filter(sale => {
            const matchesSearch = sale.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                sale.id.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'ALL' || sale.status === statusFilter;
            return matchesSearch && matchesStatus;
        }).sort((a, b) => b.createdAt - a.createdAt);
    }, [sales, searchTerm, statusFilter]);

    const getStatusColor = (status: SaleStatus) => {
        switch (status) {
            case 'ADELANTADO': return "bg-amber-100 text-amber-700 border-amber-200";
            case 'COMPLETO': return "bg-blue-100 text-blue-700 border-blue-200";
            case 'ENTREGADO': return "bg-emerald-100 text-emerald-700 border-emerald-200";
            case 'CANCELADO': return "bg-red-100 text-red-700 border-red-200";
            default: return "bg-gray-100 text-gray-700";
        }
    }

    const getStatusIcon = (status: SaleStatus) => {
        switch (status) {
            case 'ADELANTADO': return <Clock className="w-3.5 h-3.5" />;
            case 'COMPLETO': return <CheckCircle className="w-3.5 h-3.5" />; // Or specific icon
            case 'ENTREGADO': return <CheckCircle className="w-3.5 h-3.5" />;
            case 'CANCELADO': return <XCircle className="w-3.5 h-3.5" />;
            default: return null;
        }
    }

    return (
        <div className="space-y-6 h-full flex flex-col">
            {/* Filters Header */}
            <div className="flex bg-card p-1 rounded-xl border border-border/50 shadow-sm gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por cliente o ID..."
                        className="pl-10 border-transparent bg-transparent h-10 focus-visible:ring-0"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="w-px bg-border my-2" />
                <div className="flex items-center gap-2 px-3">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <select
                        className="h-10 bg-transparent text-sm font-medium focus:outline-none text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as SaleStatus | 'ALL')}
                    >
                        <option value="ALL">Todos los estados</option>
                        <option value="ADELANTADO">Adelantado</option>
                        <option value="COMPLETO">Completo</option>
                        <option value="ENTREGADO">Entregado</option>
                        <option value="CANCELADO">Cancelado</option>
                    </select>
                </div>
            </div>

            {/* Sales Table Wrapper */}
            <div className="bg-card rounded-xl border border-border/50 shadow-sm flex-1 overflow-hidden flex flex-col">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-muted/30 sticky top-0 z-10 backdrop-blur-sm">
                            <tr>
                                <th className="px-6 py-4 font-semibold">ID / Fecha</th>
                                <th className="px-6 py-4 font-semibold">Cliente</th>
                                <th className="px-6 py-4 font-semibold">Detalles</th>
                                <th className="px-6 py-4 font-semibold">Estado</th>
                                <th className="px-6 py-4 font-semibold">SLA</th>
                                <th className="px-6 py-4 font-semibold text-right">Total</th>
                                <th className="px-6 py-4 font-semibold text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            <AnimatePresence>
                                {filteredSales.length === 0 ? (
                                    <motion.tr
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                    >
                                        <td colSpan={7} className="px-6 py-20 text-center text-muted-foreground">
                                            <div className="flex flex-col items-center gap-2">
                                                <Search className="h-8 w-8 opacity-20" />
                                                <p>No se encontraron ventas</p>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ) : (
                                    filteredSales.map((sale) => {
                                        // SLA Logic
                                        const slaTarget = sale.createdAt + (24 * 60 * 60 * 1000);
                                        const now = Date.now();
                                        const isDelivered = sale.status === 'ENTREGADO' || sale.status === 'CANCELADO';
                                        const timeLeftMs = slaTarget - now;
                                        const hoursLeft = Math.floor(timeLeftMs / (1000 * 60 * 60));

                                        let slaColor = "text-emerald-600 bg-emerald-50 border-emerald-100";
                                        let slaText = `${Math.max(0, hoursLeft)}h restantes`;

                                        if (!isDelivered) {
                                            if (timeLeftMs < 0) {
                                                slaColor = "text-red-700 bg-red-50 border-red-100 animate-pulse";
                                                slaText = `VENCIDO (${Math.abs(hoursLeft)}h)`;
                                            } else if (hoursLeft < 4) {
                                                slaColor = "text-amber-700 bg-amber-50 border-amber-100";
                                                slaText = `${hoursLeft}h (Atención)`;
                                            }
                                        } else {
                                            slaColor = "text-muted-foreground bg-muted/50 border-transparent";
                                            slaText = "-";
                                        }

                                        return (
                                            <motion.tr
                                                key={sale.id}
                                                layoutId={sale.id}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="hover:bg-muted/30 transition-colors group"
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-mono text-xs font-bold text-foreground/80">#{sale.id.slice(0, 8)}</span>
                                                        <span className="text-[10px] text-muted-foreground mt-0.5">
                                                            {new Date(sale.createdAt).toLocaleDateString()} {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-sm">{sale.customer.name}</span>
                                                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5" title={sale.customer.address}>
                                                            <span className="truncate max-w-[120px]">{sale.customer.address}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        {sale.items.slice(0, 2).map((item, idx) => (
                                                            <div key={`${item.variantId}-${idx}`} className="text-xs flex items-center gap-1">
                                                                <span className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">{item.quantity}x</span>
                                                                <span className="truncate max-w-[150px]">{item.productName}</span>
                                                            </div>
                                                        ))}
                                                        {sale.items.length > 2 && (
                                                            <span className="text-[10px] text-muted-foreground italic">+ {sale.items.length - 2} más...</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="relative group/status w-fit">
                                                        <span className={cn(
                                                            "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border transition-all gap-1.5 cursor-pointer hover:shadow-sm",
                                                            getStatusColor(sale.status)
                                                        )}>
                                                            {getStatusIcon(sale.status)}
                                                            {sale.status}
                                                        </span>

                                                        <select
                                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                            value={sale.status}
                                                            onChange={(e) => {
                                                                if (confirm(`¿Cambiar estado a ${e.target.value}?`)) {
                                                                    updateSaleStatus(sale.id, e.target.value as SaleStatus);
                                                                }
                                                            }}
                                                        >
                                                            <option value="ADELANTADO">ADELANTADO</option>
                                                            <option value="COMPLETO">COMPLETO</option>
                                                            <option value="ENTREGADO">ENTREGADO</option>
                                                            <option value="CANCELADO">CANCELADO</option>
                                                        </select>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className={cn("px-2.5 py-1 rounded-lg text-xs font-medium border w-fit whitespace-nowrap", slaColor)}>
                                                        {slaText}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold">
                                                    S/ {sale.total.toFixed(2)}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => generateReceipt(sale)}
                                                            className="p-2 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
                                                            title="Imprimir Boleta"
                                                        >
                                                            <FileText className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setSaleToDelete(sale.id)}
                                                            className="p-2 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors"
                                                            title="Eliminar Venta"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        )
                                    })
                                )}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </div>

            <ConfirmDialog
                isOpen={!!saleToDelete}
                onClose={() => setSaleToDelete(null)}
                onConfirm={() => {
                    if (saleToDelete) {
                        deleteSale(saleToDelete);
                        setSaleToDelete(null);
                    }
                }}
                title="Eliminar Venta"
                message="¿Estás seguro que deseas eliminar esta venta permanentemente? Esta acción no se puede deshacer."
                confirmText="Sí, Eliminar"
                cancelText="Cancelar"
                variant="danger"
            />
        </div>
    )
}
