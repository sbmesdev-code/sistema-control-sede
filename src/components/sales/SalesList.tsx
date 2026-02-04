import { useState, useMemo } from 'react'
import { FileText, Search, Filter, AlertTriangle, Clock, CheckCircle } from 'lucide-react'
import { useSalesStore } from '../../lib/salesStore'
import { Input } from '../ui/input'
import { generateReceipt } from '../../lib/receiptGenerator'
import type { SaleStatus } from '../../types/sales'

export function SalesList() {
    const { sales, updateSaleStatus } = useSalesStore()
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState<SaleStatus | 'ALL'>('ALL')

    const filteredSales = useMemo(() => {
        return sales.filter(sale => {
            const matchesSearch = sale.customer.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'ALL' || sale.status === statusFilter;
            return matchesSearch && matchesStatus;
        }).sort((a, b) => b.createdAt - a.createdAt);
    }, [sales, searchTerm, statusFilter]);

    return (
        <div className="space-y-6 h-full flex flex-col">
            {/* Filters Header */}
            <div className="flex gap-4 items-center bg-card p-4 rounded-xl border border-border">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por cliente..."
                        className="pl-9 bg-background"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <select
                        className="h-10 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as SaleStatus | 'ALL')}
                    >
                        <option value="ALL">Todos los estados</option>
                        <option value="ADELANTADO">Adelantado</option>
                        <option value="COMPLETO">Pagado / Completo</option>
                        <option value="ENTREGADO">Entregado</option>
                        <option value="CANCELADO">Cancelado</option>
                    </select>
                </div>
            </div>

            {/* Sales Table */}
            <div className="flex-1 overflow-auto border border-border rounded-xl bg-card shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-muted/50 sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                ID / Fecha
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                Cliente
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                Detalles
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                Estado
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                Tiempo Restante (SLA)
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                Total
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                Acciones
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-card">
                        {filteredSales.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                                    No se encontraron ventas
                                </td>
                            </tr>
                        ) : (
                            filteredSales.map((sale) => {
                                // SLA Logic ⏳
                                const slaTarget = sale.createdAt + (24 * 60 * 60 * 1000);
                                const now = Date.now();
                                const isDelivered = sale.status === 'ENTREGADO';
                                const timeLeftMs = slaTarget - now;
                                const hoursLeft = Math.floor(timeLeftMs / (1000 * 60 * 60));
                                const minutesLeft = Math.floor((timeLeftMs % (1000 * 60 * 60)) / (1000 * 60));

                                let slaColor = "text-emerald-600";
                                let slaText = `${hoursLeft}h ${minutesLeft}m`;

                                if (!isDelivered) {
                                    if (timeLeftMs < 0) {
                                        slaColor = "text-red-600 font-bold animate-pulse";
                                        slaText = `VENCIDO (${Math.abs(hoursLeft)}h)`;
                                    } else if (hoursLeft < 4) {
                                        slaColor = "text-orange-500 font-semibold";
                                    }
                                } else {
                                    slaColor = "text-muted-foreground";
                                    slaText = "Completado";
                                }

                                return (
                                    <tr key={sale.id} className="hover:bg-muted/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="font-mono text-xs font-bold">{sale.id.slice(0, 8)}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(sale.createdAt).toLocaleDateString()}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm">{sale.customer.name}</span>
                                                <span className="text-xs text-muted-foreground truncate max-w-[150px]" title={sale.customer.address}>
                                                    {sale.customer.address}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1 max-w-[200px]">
                                                {sale.items.map(item => (
                                                    <span key={item.variantId} className="text-xs">
                                                        <b>{item.quantity}x</b> {item.productName} <span className="text-muted-foreground">({item.color}/{item.size})</span>
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="relative group w-fit cursor-pointer">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium w-full min-w-[100px] justify-center transition-all group-hover:opacity-80
                                                    ${sale.status === 'ADELANTADO' ? 'bg-yellow-100 text-yellow-800' : ''}
                                                    ${sale.status === 'COMPLETO' ? 'bg-blue-100 text-blue-800' : ''}
                                                    ${sale.status === 'ENTREGADO' ? 'bg-green-100 text-green-800' : ''}
                                                    ${sale.status === 'CANCELADO' ? 'bg-red-100 text-red-800' : ''}
                                                `}>
                                                    {sale.status === 'ADELANTADO' && <Clock className="w-3 h-3 mr-1" />}
                                                    {sale.status === 'ENTREGADO' && <CheckCircle className="w-3 h-3 mr-1" />}
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

                                                {/* Edit Hint (Hover) */}
                                                <div className="absolute -right-2 -top-1">
                                                    <span className="flex h-2 w-2 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="bg-muted/40 p-2 rounded-lg border border-border/50">
                                                <div className={`flex items-center gap-2 text-sm ${slaColor}`}>
                                                    {!isDelivered && timeLeftMs < 0 && <AlertTriangle className="h-4 w-4" />}
                                                    {isDelivered && <CheckCircle className="h-4 w-4" />}
                                                    <span className="font-mono font-medium">{slaText}</span>
                                                </div>
                                                {/* Progress Bar Visual */}
                                                {!isDelivered && timeLeftMs > 0 && (
                                                    <div className="w-24 h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${hoursLeft < 4 ? 'bg-orange-500' : 'bg-emerald-500'}`}
                                                            style={{ width: `${Math.max(0, Math.min(100, (1 - (timeLeftMs / (24 * 60 * 60 * 1000))) * 100))}%` }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-foreground">
                                            S/ {sale.total.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => {
                                                    try {
                                                        generateReceipt(sale);
                                                    } catch (error) {
                                                        console.error("Error generating receipt:", error);
                                                        alert("Error al generar la boleta. Verifica la consola.");
                                                    }
                                                }}
                                                className="text-muted-foreground hover:text-primary transition-colors p-2 hover:bg-accent rounded-full"
                                                title="Imprimir Boleta"
                                            >
                                                <FileText className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
