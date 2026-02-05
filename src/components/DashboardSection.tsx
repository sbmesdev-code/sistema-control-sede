import { useMemo } from 'react';
import { useInventoryStore } from '../lib/store';
import { useSalesStore } from '../lib/salesStore';
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    Package,
    AlertCircle,
    Activity,
    ArrowUpRight,
    ArrowDownRight,
    Wallet
} from 'lucide-react';
import { cn } from '../lib/utils'; // Assuming cn exists in utils, based on App.tsx

export function DashboardSection() {
    const { products } = useInventoryStore();
    const { sales } = useSalesStore();

    const metrics = useMemo(() => {
        // 1. Inventory Helpers
        let totalStock = 0;
        let potentialRevenue = 0; // Tentativa de ingresos (Retail Price * Stock)
        let inventoryCost = 0;    // Inversión en inventario (Production Price * Stock)

        products.forEach(product => {
            product.variants.forEach(variant => {
                totalStock += variant.stock;
                potentialRevenue += variant.stock * variant.priceRetail;
                inventoryCost += variant.stock * variant.priceProduction;
            });
        });

        // 2. Sales Processing (Current Month)
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const activeSales = sales.filter(s => s.status !== 'CANCELADO');

        const monthlySales = activeSales.filter(sale => {
            const d = new Date(sale.createdAt);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

        const totalIncomeMonth = monthlySales.reduce((acc, sale) => acc + sale.total, 0);

        // Calculate COGS for Monthly Sales
        let totalCOGSMonth = 0;
        monthlySales.forEach(sale => {
            sale.items.forEach(item => {
                // Find original product variant cost
                const product = products.find(p => p.variants.some(v => v.id === item.variantId));
                const variant = product?.variants.find(v => v.id === item.variantId);
                // Use current production price as approximation if historical not stored on line item
                // Ideally this should be stored on SaleItem, but for now we look it up.
                const cost = variant ? variant.priceProduction : 0;
                totalCOGSMonth += item.quantity * cost;
            });
        });

        const estimatedProfitMonth = totalIncomeMonth - totalCOGSMonth; // Net Profit Month
        const profitMargin = totalIncomeMonth > 0 ? (estimatedProfitMonth / totalIncomeMonth) * 100 : 0;

        // 3. Pending Orders (System wide)
        const pendingOrders = activeSales.filter(sale => sale.status !== 'ENTREGADO').length;

        return {
            totalStock,
            potentialRevenue,
            inventoryCost,
            totalIncomeMonth,
            totalCOGSMonth,
            estimatedProfitMonth,
            profitMargin,
            pendingOrders
        };
    }, [products, sales]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col gap-2 border-b border-border/50 pb-6">
                <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    Panel de Control
                </h1>
                <p className="text-muted-foreground text-lg">
                    Visión general del rendimiento y proyecciones financieras.
                </p>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                    title="Ingresos del Mes"
                    value={`S/ ${metrics.totalIncomeMonth.toFixed(2)}`}
                    icon={<DollarSign className="w-5 h-5 text-emerald-500" />}
                    trend={metrics.profitMargin > 0 ? "+ Rentable" : "Neutro"}
                    trendUp={metrics.profitMargin > 20}
                    description="Facturación bruta mensual"
                />
                <KPICard
                    title="Gastos (COGS)"
                    value={`S/ ${metrics.totalCOGSMonth.toFixed(2)}`}
                    icon={<TrendingDown className="w-5 h-5 text-rose-500" />}
                    description="Costo de mercancía vendida"
                />
                <KPICard
                    title="Beneficio Neto (Est.)"
                    value={`S/ ${metrics.estimatedProfitMonth.toFixed(2)}`}
                    icon={<Wallet className="w-5 h-5 text-indigo-500" />}
                    description={`Margen: ${metrics.profitMargin.toFixed(1)}%`}
                    highlight
                />
                <KPICard
                    title="Pedidos Pendientes"
                    value={metrics.pendingOrders.toString()}
                    icon={<Activity className="w-5 h-5 text-orange-500" />}
                    description="En proceso de entrega"
                />
            </div>

            {/* Main Content Split */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Financial Projections (Left 2 cols) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-xl font-bold flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-primary" />
                                    Proyección Financiera
                                </h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Basado en el inventario actual y precios de venta.
                                </p>
                            </div>
                            <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold">
                                Inventario Actual
                            </div>
                        </div>

                        {/* Projection Details */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                            <div className="p-4 rounded-xl bg-accent/30 border border-border/30 backdrop-blur-sm">
                                <span className="text-sm text-muted-foreground block mb-1">Inversión en Stock</span>
                                <div className="text-2xl font-bold flex items-center gap-2">
                                    S/ {metrics.inventoryCost.toFixed(2)}
                                    <span className="text-xs font-normal px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Costo</span>
                                </div>
                            </div>
                            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-sm relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                                <span className="text-sm text-emerald-600/80 dark:text-emerald-400/80 block mb-1 font-medium">
                                    Tentativa de Ingresos
                                </span>
                                <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                                    S/ {metrics.potentialRevenue.toFixed(2)}
                                    <ArrowUpRight className="w-4 h-4" />
                                </div>
                                <p className="text-xs text-emerald-600/60 dark:text-emerald-400/60 mt-1">
                                    Si se vende todo el stock actual
                                </p>
                            </div>
                        </div>

                        {/* Potential Profit Breakdown */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Desglose de Rentabilidad Potencial</h4>
                            <div className="h-4 w-full bg-secondary/50 rounded-full overflow-hidden flex">
                                <div
                                    className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                                    style={{ width: `${(metrics.inventoryCost / metrics.potentialRevenue) * 100}%` }}
                                />
                                <div
                                    className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                                    style={{ width: `${(1 - (metrics.inventoryCost / metrics.potentialRevenue)) * 100}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-indigo-500" />
                                    <span className="text-muted-foreground">Costo de Inversión ({((metrics.inventoryCost / metrics.potentialRevenue) * 100).toFixed(0)}%)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                        Ganancia Potencial (S/ {(metrics.potentialRevenue - metrics.inventoryCost).toFixed(2)})
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Inventory Snapshot (Right col) */}
                <div className="space-y-6">
                    <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm h-full flex flex-col justify-between">
                        <div>
                            <h3 className="text-xl font-bold flex items-center gap-2 mb-6">
                                <Package className="w-5 h-5 text-primary" />
                                Estado del Stock
                            </h3>

                            <div className="bg-primary/5 rounded-2xl p-8 flex flex-col items-center justify-center text-center mb-6">
                                <span className="text-5xl font-extrabold text-primary mb-2">
                                    {metrics.totalStock}
                                </span>
                                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                                    Unidades Totales
                                </span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                                <div className="flex items-center gap-3">
                                    <AlertCircle className="w-4 h-4 text-orange-500" />
                                    <span className="text-sm">Stock Bajo ( &lt; 5 )</span>
                                </div>
                                <span className="font-bold">
                                    {products.reduce((acc, p) => acc + p.variants.filter(v => v.stock <= 5 && v.stock > 0).length, 0)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                                <div className="flex items-center gap-3">
                                    <AlertCircle className="w-4 h-4 text-destructive" />
                                    <span className="text-sm">Agotados</span>
                                </div>
                                <span className="font-bold">
                                    {products.reduce((acc, p) => acc + p.variants.filter(v => v.stock === 0).length, 0)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

// Sub-components for cleaner internal organization
function KPICard({ title, value, icon, trend, trendUp, description, highlight = false }: {
    title: string;
    value: string;
    icon: React.ReactNode;
    trend?: string;
    trendUp?: boolean;
    description?: string;
    highlight?: boolean;
}) {
    return (
        <div className={cn(
            "rounded-xl p-6 border transition-all duration-300 hover:shadow-lg relative overflow-hidden group",
            highlight
                ? "bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20"
                : "bg-card border-border/50 hover:border-border"
        )}>
            {/* Background Glow Effect */}
            {highlight && <div className="absolute -top-10 -right-10 w-24 h-24 bg-primary/20 blur-3xl rounded-full" />}

            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="p-2 sm:p-3 rounded-lg bg-background shadow-sm border border-border/50">
                    {icon}
                </div>
                {trend && (
                    <div className={cn(
                        "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border",
                        trendUp
                            ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20"
                            : "text-muted-foreground bg-secondary border-transparent"
                    )}>
                        {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {trend}
                    </div>
                )}
            </div>

            <div className="relative z-10">
                <h3 className="text-sm font-medium text-muted-foreground mb-1">{title}</h3>
                <div className="text-2xl sm:text-3xl font-bold tracking-tight mb-1">{value}</div>
                {description && (
                    <p className="text-xs text-muted-foreground/80">{description}</p>
                )}
            </div>
        </div>
    )
}
