import { useState, useMemo } from 'react';
import { useSalesStore } from '../lib/salesStore';
import { useInventoryStore } from '../lib/store';
import { useExpensesStore } from '../lib/expensesStore';
import {
    PieChart, Pie, Cell, ResponsiveContainer,
    XAxis, YAxis, Tooltip, Legend, CartesianGrid,
    AreaChart, Area
} from 'recharts';
import {
    Download,
    Plus,
    Trash2,
    DollarSign,
    TrendingDown,
    FileText
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ExpenseCategory } from '../types/expenses';

export function AccountingSection() {
    const { sales } = useSalesStore();
    const { products } = useInventoryStore();
    const { expenses, addExpense, removeExpense } = useExpensesStore();

    const [viewMode, setViewMode] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

    // --- FORM STATE ---
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<ExpenseCategory>('OTROS');
    const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
    const [isFixed, setIsFixed] = useState(false);

    // --- METRICS CALCULATION ---
    const metrics = useMemo(() => {
        // Filter Sales and Expenses by Period
        const filteredSales = sales.filter(s => {
            if (s.status === 'CANCELADO') return false;
            const d = new Date(s.createdAt);
            if (d.getFullYear() !== selectedYear) return false;
            if (viewMode === 'MONTHLY' && d.getMonth() !== selectedMonth) return false;
            return true;
        });

        const filteredExpenses = expenses.filter(e => {
            const d = new Date(e.date);
            if (d.getFullYear() !== selectedYear) return false;
            if (viewMode === 'MONTHLY' && d.getMonth() !== selectedMonth) return false;
            return true;
        });

        // 1. Income (Gross)
        const income = filteredSales.reduce((acc, sale) => acc + sale.total, 0);

        // 2. COGS (Cost of Goods Sold for the SOLD items only)
        let cogs = 0;
        filteredSales.forEach(sale => {
            sale.items.forEach(item => {
                const product = products.find(p => p.variants.some(v => v.id === item.variantId));
                const variant = product?.variants.find(v => v.id === item.variantId);
                cogs += item.quantity * (variant?.priceProduction || 0);
            });
        });

        // 3. Operating Expenses
        // 3. Generate Inventory Expenses from Products (based on creation date)
        const inventoryExpenses: any[] = [];
        products.forEach(p => {
            const d = new Date(p.createdAt);
            // Check if product creation falls within selected period
            let inPeriod = false;
            if (d.getFullYear() === selectedYear) {
                if (viewMode === 'ANNUAL') inPeriod = true;
                else if (d.getMonth() === selectedMonth) inPeriod = true;
            }

            if (inPeriod) {
                let stockCost = 0;
                p.variants.forEach(v => {
                    stockCost += v.stock * (v.priceProduction || 0);
                });

                if (stockCost > 0) {
                    inventoryExpenses.push({
                        id: `inv-${p.id}`,
                        description: `Inventario Inicial: ${p.name}`,
                        amount: stockCost,
                        category: 'COSTO_PRODUCCION',
                        date: p.createdAt,
                        createdAt: p.createdAt,
                        updatedAt: p.createdAt,
                        isFixed: false
                    });
                }
            }
        });

        // Combine Real Expenses + Inventory Expenses for calculations
        const combinedExpenses = [...filteredExpenses, ...inventoryExpenses];

        // 4. Totals (Operating Expenses includes Inventory Cost now as per user request)
        const totalExpenses = combinedExpenses.reduce((acc, e) => acc + e.amount, 0);
        const totalOutflows = cogs + totalExpenses;
        const netProfit = income - totalOutflows;

        // 5. Data for Charts
        // Category Distribution
        const expenseByCategory: Record<string, number> = {};
        combinedExpenses.forEach(e => {
            let cat = e.category;
            // Distinguish Inventory Cost in Pie Chart
            if (e.id.startsWith('inv-')) {
                cat = 'COSTO_ALMACEN (No Vendido)';
            }
            expenseByCategory[cat] = (expenseByCategory[cat] || 0) + e.amount;
        });

        // Add COGS to Pie Chart Data
        if (cogs > 0) {
            expenseByCategory['COSTO_PRODUCCION (Vendido)'] = cogs;
        }

        const pieData = Object.entries(expenseByCategory).map(([name, value]) => ({ name, value }));

        // Daily/Monthly Trend
        let trendData: any[] = [];
        if (viewMode === 'MONTHLY') {
            // Daily breakdown for the month
            const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
            for (let i = 1; i <= daysInMonth; i++) {
                trendData.push({ name: `${i}`, income: 0, expenses: 0, cogs: 0 });
            }
            filteredSales.forEach(s => {
                const day = new Date(s.createdAt).getDate();
                trendData[day - 1].income += s.total;
                s.items.forEach(item => {
                    const product = products.find(p => p.variants.some(v => v.id === item.variantId));
                    const variant = product?.variants.find(v => v.id === item.variantId);
                    trendData[day - 1].cogs += item.quantity * (variant?.priceProduction || 0);
                });
            });
            // Use combinedExpenses to populate chart
            combinedExpenses.forEach(e => {
                const day = new Date(e.date).getDate();
                trendData[day - 1].expenses += e.amount;
            });
            // Sum COGS + OpEx for total expenses line
            trendData.forEach(d => d.expenses += d.cogs);
        } else {
            // Monthly breakdown for the year
            const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
            trendData = months.map(m => ({ name: m, income: 0, expenses: 0, cogs: 0 }));
            filteredSales.forEach(s => {
                const m = new Date(s.createdAt).getMonth();
                trendData[m].income += s.total;
                s.items.forEach(item => {
                    const product = products.find(p => p.variants.some(v => v.id === item.variantId));
                    const variant = product?.variants.find(v => v.id === item.variantId);
                    trendData[m].cogs += item.quantity * (variant?.priceProduction || 0);
                });
            });
            // Use combinedExpenses
            combinedExpenses.forEach(e => {
                const m = new Date(e.date).getMonth();
                trendData[m].expenses += e.amount;
            });
            // Sum COGS + OpEx
            trendData.forEach(d => d.expenses += d.cogs);
        }

        // 6. Display Expenses (Include COGS as a virtual expense)
        // 6. Display Expenses (Include COGS as a virtual expense)
        const allExpenses: any[] = [...combinedExpenses];
        if (cogs > 0) {
            allExpenses.push({
                id: 'cogs-summary',
                description: 'Costo de Producción de Inventario (Vendido)',
                amount: cogs,
                category: 'COSTO_PRODUCCION',
                date: new Date(selectedYear, viewMode === 'MONTHLY' ? selectedMonth + 1 : 12, 0).getTime(), // End of period (or distributed? User probably ok with summary line for COGS)
                createdAt: Date.now(),
                updatedAt: Date.now(),
                isFixed: false
            });
        }

        // Sort by date desc
        allExpenses.sort((a, b) => b.date - a.date);

        return {
            income,
            cogs,
            operatingExpenses: totalExpenses,
            totalOutflows,
            netProfit,
            filteredExpenses,
            allExpenses,
            pieData,
            trendData
        };
    }, [sales, products, expenses, viewMode, selectedMonth, selectedYear]);

    // --- ACTIONS ---
    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addExpense({
                description,
                amount: parseFloat(amount),
                category,
                date: new Date(expenseDate).getTime(), // Set selected date noon
                createdAt: Date.now(),
                updatedAt: Date.now()
            });
            setIsExpenseModalOpen(false);
            setAmount('');
            setDescription('');
        } catch (error) {
            console.error(error);
        }
    };

    const generatePDF = () => {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(20);
        doc.text(`Reporte Financiero - ${viewMode === 'MONTHLY' ? `${selectedMonth + 1}/${selectedYear}` : selectedYear}`, 14, 22);

        doc.setFontSize(10);
        doc.text(`Generado: ${new Date().toLocaleString()}`, 14, 28);

        // Summary Table
        autoTable(doc, {
            startY: 35,
            head: [['Concepto', 'Monto']],
            body: [
                ['Ingresos Brutos', `S/ ${metrics.income.toFixed(2)}`],
                ['Costo de Ventas (COGS)', `S/ ${metrics.cogs.toFixed(2)}`],
                ['Gastos Operativos', `S/ ${metrics.operatingExpenses.toFixed(2)}`],
                ['UTILIDAD NETA', `S/ ${metrics.netProfit.toFixed(2)}`],
            ],
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185] }
        });

        // Expenses Detail
        doc.text("Detalle de Gastos (Operativos + Producción)", 14, (doc as any).lastAutoTable.finalY + 10);

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 15,
            head: [['Fecha', 'Descripción', 'Categoría', 'Monto']],
            body: metrics.allExpenses.map(e => [
                new Date(e.date).toLocaleDateString(),
                e.description,
                e.category,
                `S/ ${e.amount.toFixed(2)}`
            ]),
            theme: 'grid'
        });

        doc.save(`reporte_financiero_${selectedYear}_${selectedMonth + 1}.pdf`);
        toast.success("Reporte descargado");
    };

    // Constants
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ef4444', '#3b82f6'];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Contabilidad</h1>
                    <p className="text-muted-foreground">Gestión de ingresos, gastos y reportes financieros.</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center rounded-lg border border-border bg-card p-1">
                        <button
                            onClick={() => setViewMode('MONTHLY')}
                            className={cn("px-3 py-1 text-sm font-medium rounded-md transition-all", viewMode === 'MONTHLY' ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-accent hover:text-accent-foreground text-muted-foreground")}
                        >
                            Mensual
                        </button>
                        <button
                            onClick={() => setViewMode('ANNUAL')}
                            className={cn("px-3 py-1 text-sm font-medium rounded-md transition-all", viewMode === 'ANNUAL' ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-accent hover:text-accent-foreground text-muted-foreground")}
                        >
                            Anual
                        </button>
                    </div>

                    {viewMode === 'MONTHLY' && (
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                            {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((m, i) => (
                                <option key={i} value={i}>{m}</option>
                            ))}
                        </select>
                    )}

                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="h-9 rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                        {[2024, 2025, 2026].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>

                    <button onClick={generatePDF} className="h-9 w-9 flex items-center justify-center rounded-md border border-border hover:bg-accent transition-colors" title="Descargar Reporte">
                        <Download size={16} />
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 shadow-sm">
                    <div className="flex items-center gap-2 text-emerald-600 font-medium mb-2">
                        <DollarSign size={18} /> Ingresos Brutos
                    </div>
                    <div className="text-2xl font-bold">S/ {metrics.income.toFixed(2)}</div>
                </div>
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-6 shadow-sm col-span-2">
                    <div className="flex items-center gap-2 text-rose-600 font-medium mb-3">
                        <TrendingDown size={18} /> Total Egresos (Costo Stock + Op.)
                    </div>
                    <div className="flex items-baseline gap-4">
                        <div className="text-2xl font-bold">S/ {metrics.totalOutflows.toFixed(2)}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <span title="Costo de Mercadería">COGS: {metrics.cogs.toFixed(0)}</span>
                            <span>+</span>
                            <span title="Costo de Mercadería">COGS: {metrics.cogs.toFixed(0)}</span>
                            <span>+</span>
                            <span title="Gastos Operativos + Inventario">Gastos: {metrics.operatingExpenses.toFixed(0)}</span>
                        </div>
                    </div>
                </div>
                <div className={cn("rounded-xl border p-6 shadow-sm bg-gradient-to-br", metrics.netProfit >= 0 ? "from-indigo-500/10 to-purple-500/10 border-indigo-500/20" : "from-red-500/10 to-orange-500/10 border-red-500/20")}>
                    <div className="flex items-center gap-2 text-foreground font-medium mb-2">
                        <FileText size={18} /> Utilidad Neta
                    </div>
                    <div className={cn("text-2xl font-bold", metrics.netProfit >= 0 ? "text-indigo-600 dark:text-indigo-400" : "text-red-600")}>
                        S/ {metrics.netProfit.toFixed(2)}
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[400px]">
                <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col">
                    <h3 className="font-semibold mb-6">Evolución Financiera</h3>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={metrics.trendData}>
                                <defs>
                                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `S/${value}`} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    formatter={(value: any) => [`S/ ${Number(value).toFixed(2)}`, '']}
                                />
                                <Legend />
                                <Area type="monotone" dataKey="income" name="Ingresos" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={2} />
                                <Area type="monotone" dataKey="expenses" name="Gastos" stroke="#f43f5e" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col">
                    <h3 className="font-semibold mb-6">Distribución de Gastos</h3>
                    <div className="flex-1 min-h-0">
                        {metrics.pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={metrics.pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {metrics.pieData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: any) => `S/ ${Number(value).toFixed(2)}`} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                                No hay gastos registrados
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Expenses Management */}
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
                    <h3 className="font-semibold">Registro de Gastos</h3>
                    <button
                        onClick={() => setIsExpenseModalOpen(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors"
                    >
                        <Plus size={16} /> Nuevo Gasto
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fecha</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Descripción</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipo</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Categoría</th>
                                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Monto</th>
                                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {metrics.allExpenses.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                                        No hay gastos registrados en este periodo.
                                    </td>
                                </tr>
                            ) : (
                                metrics.allExpenses.map((expense) => (
                                    <tr key={expense.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {new Date(expense.date).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3 font-medium">{expense.description}</td>
                                        <td className="px-4 py-3">
                                            {expense.category === 'COSTO_PRODUCCION' ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200">
                                                    Variable (Auto)
                                                </span>
                                            ) : expense.isFixed ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                                    Fijo
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                                                    Variable
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground uppercase">
                                                {expense.category}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono">
                                            S/ {expense.amount.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {expense.id !== 'cogs-summary' && !expense.id.toString().startsWith('inv-') && (
                                                <button
                                                    onClick={() => removeExpense(expense.id)}
                                                    className="text-muted-foreground hover:text-destructive transition-colors p-1"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isExpenseModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-card rounded-lg shadow-lg w-full max-w-md border border-border animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-border">
                            <h3 className="font-semibold text-lg">Registrar Gasto</h3>
                        </div>
                        <form onSubmit={handleAddExpense} className="p-4 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Descripción</label>
                                <input
                                    required
                                    type="text"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Ej. Pago de luz"
                                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm focus:ring-1 focus:ring-ring"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Monto (S/)</label>
                                    <input
                                        required
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={amount}
                                        onChange={e => setAmount(e.target.value)}
                                        className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm focus:ring-1 focus:ring-ring"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Fecha</label>
                                    <input
                                        type="date"
                                        value={expenseDate}
                                        onChange={e => setExpenseDate(e.target.value)}
                                        className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm focus:ring-1 focus:ring-ring"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 p-2 rounded-md border border-input bg-accent/20">
                                <input
                                    type="checkbox"
                                    id="isFixed"
                                    checked={isFixed}
                                    onChange={e => setIsFixed(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <label htmlFor="isFixed" className="text-sm font-medium cursor-pointer select-none">
                                    Es un gasto fijo / recurrente (mensual)
                                </label>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Categoría</label>
                                <select
                                    value={category}
                                    onChange={e => setCategory(e.target.value as any)}
                                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm focus:ring-1 focus:ring-ring"
                                >
                                    <option value="ALQUILER">Alquiler</option>
                                    <option value="SERVICIOS">Servicios (Luz/Agua)</option>
                                    <option value="PERSONAL">Personal/Planilla</option>
                                    <option value="MARKETING">Marketing/Publicidad</option>
                                    <option value="MATERIALES">Materiales/Insumos</option>
                                    <option value="IMPUESTOS">Impuestos</option>
                                    <option value="LOGISTICA">Logística/Transporte</option>
                                    <option value="OTROS">Otros</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsExpenseModalOpen(false)}
                                    className="px-4 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                                >
                                    Guardar Gasto
                                </button>
                            </div>
                        </form>
                    </div>
                </div >
            )
            }
        </div >
    );
}
