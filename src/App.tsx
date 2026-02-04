import { useState, useMemo } from 'react'
import { LayoutDashboard, Package, ShoppingCart, Settings, Menu, Bell, Search, Layers, Tag } from 'lucide-react'
import { Toaster } from 'sonner'
import { cn } from './lib/utils'
import { InventorySection } from './components/InventorySection'
import { SalesSection } from './components/SalesSection'
import { PromotionsSection } from './components/PromotionsSection'
import { SettingsSection } from './components/SettingsSection'
import { useInventoryStore } from './lib/store'
import { useSalesStore } from './lib/salesStore'

type View = 'DASHBOARD' | 'INVENTORY' | 'SALES' | 'PROMOTIONS' | 'SETTINGS';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [currentView, setCurrentView] = useState<View>('DASHBOARD')

  // Real Data Hooks
  const { products } = useInventoryStore()
  const { sales } = useSalesStore()

  // Metrics Calculation
  const metrics = useMemo(() => {
    // 1. Total Inventory Count (Sum of all variant stocks)
    const inventoryCount = products.reduce((acc, product) => {
      return acc + product.variants.reduce((vAcc, variant) => vAcc + variant.stock, 0);
    }, 0);

    // 2. Sales this month
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlySales = sales.filter(sale => {
      const d = new Date(sale.createdAt);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear && sale.status !== 'CANCELADO';
    }).reduce((acc, sale) => acc + sale.total, 0);

    // 3. Pending Orders
    const pendingOrders = sales.filter(sale => sale.status !== 'ENTREGADO' && sale.status !== 'CANCELADO').length;

    // 4. Estimated Profit (Ganancias)
    // Profit = (Subtotal - GlobalDiscount) - COGS
    // We exclude shipping from profit calculation assuming it's a pass-through cost or handled separately.
    const estimatedProfit = sales.filter(s => s.status !== 'CANCELADO').reduce((acc, sale) => {
      const income = sale.subtotal - sale.globalDiscount;
      const cogs = sale.items.reduce((itemAcc, item) => {
        // Look up cost in current inventory (Note: this uses current cost, not historical cost)
        const product = products.find(p => p.variants.some(v => v.id === item.variantId));
        const variant = product?.variants.find(v => v.id === item.variantId);
        return itemAcc + (item.quantity * (variant?.priceProduction || 0));
      }, 0);
      return acc + (income - cogs);
    }, 0);

    return {
      inventoryCount,
      monthlySales,
      pendingOrders,
      estimatedProfit
    };
  }, [products, sales]);

  return (
    <div className="min-h-screen bg-background text-foreground flex overflow-hidden">
      <Toaster richColors position="top-center" />
      {/* Sidebar */}
      <aside className={cn(
        "bg-card border-r border-border transition-all duration-300 ease-in-out z-20",
        isSidebarOpen ? "w-64" : "w-20"
      )}>
        <div className="h-16 flex items-center justify-center border-b border-border gap-2">
          <Layers className={cn("text-primary transition-all", isSidebarOpen ? "h-8 w-8" : "h-6 w-6")} />
          <h1 className={cn("font-bold text-2xl text-primary transition-all overflow-hidden whitespace-nowrap", !isSidebarOpen && "w-0 opacity-0")}>
            SCS
          </h1>
        </div>

        <nav className="p-4 space-y-2">
          <NavItem
            icon={<LayoutDashboard size={20} />}
            label="Dashboard"
            isOpen={isSidebarOpen}
            active={currentView === 'DASHBOARD'}
            onClick={() => setCurrentView('DASHBOARD')}
          />
          <NavItem
            icon={<Package size={20} />}
            label="Inventario"
            isOpen={isSidebarOpen}
            active={currentView === 'INVENTORY'}
            onClick={() => setCurrentView('INVENTORY')}
          />
          <NavItem
            icon={<ShoppingCart size={20} />}
            label="Ventas"
            isOpen={isSidebarOpen}
            active={currentView === 'SALES'}
            onClick={() => setCurrentView('SALES')}
          />
          <div className="pt-4 mt-4 border-t border-border">
            <NavItem
              icon={<Settings size={20} />}
              label="Configuración"
              isOpen={isSidebarOpen}
              active={currentView === 'SETTINGS'}
              onClick={() => setCurrentView('SETTINGS')}
            />
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-accent rounded-md transition-colors">
              <Menu size={20} />
            </button>
            <div className="relative hidden md:block">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar..."
                className="pl-9 h-9 w-64 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-accent rounded-full relative">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-destructive rounded-full"></span>
            </button>
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium">
              A
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          {currentView === 'DASHBOARD' && (
            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Bienvenido al SCS</h1>
                <p className="text-muted-foreground">Sistema de Control de Sede - Panel Principal</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card
                  title="Inventario Total (Unidades)"
                  value={metrics.inventoryCount.toString()}
                  icon={<Package className="text-primary" />}
                />
                <Card
                  title="Ventas del Mes"
                  value={`S/ ${metrics.monthlySales.toFixed(2)}`}
                  icon={<ShoppingCart className="text-primary" />}
                />
                <Card
                  title="Ganancia Estimada"
                  value={`S/ ${metrics.estimatedProfit.toFixed(2)}`}
                  icon={<Tag className="text-emerald-500" />}
                />
                <Card
                  title="Pedidos Pendientes"
                  value={metrics.pendingOrders.toString()}
                  icon={<Bell className="text-destructive" />}
                />
              </div>

              <div className="rounded-xl border border-border bg-card text-card-foreground shadow p-6">
                <h3 className="font-semibold leading-none tracking-tight mb-4">Estado del Sistema</h3>
                <p className="text-sm text-muted-foreground">
                  Sistema operativo v1.0. Las métricas se actualizan en tiempo real.
                </p>
              </div>
            </div>
          )}


          {currentView === 'INVENTORY' && (
            <div className="h-full">
              <InventorySection />
            </div>
          )}


          {currentView === 'SALES' && (
            <SalesSection />
          )}

          {currentView === 'PROMOTIONS' && (
            <PromotionsSection />
          )}

          {currentView === 'SETTINGS' && (
            <SettingsSection />
          )}
        </main>
      </div>
    </div>
  )
}

function NavItem({ icon, label, isOpen, active = false, onClick }: { icon: React.ReactNode, label: string, isOpen: boolean, active?: boolean, onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 group relative",
        active ? "bg-primary/10 text-primary" : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"
      )}>
      <span className={cn("transition-colors", active ? "text-primary" : "group-hover:text-primary")}>{icon}</span>
      <span className={cn(
        "whitespace-nowrap transition-all duration-300 origin-left font-medium",
        !isOpen && "scale-0 w-0 opacity-0 overflow-hidden"
      )}>
        {label}
      </span>
      {!isOpen && (
        <div className="absolute left-14 bg-popover text-popover-foreground px-2 py-1 rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
          {label}
        </div>
      )}
    </button>
  )
}

function Card({ title, value, icon }: { title: string, value: string, icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card text-card-foreground shadow">
      <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
        <h3 className="tracking-tight text-sm font-medium text-muted-foreground">{title}</h3>
        {icon}
      </div>
      <div className="p-6 pt-0 mt-2">
        <div className="text-2xl font-bold">{value}</div>
      </div>
    </div>
  )
}

export default App
