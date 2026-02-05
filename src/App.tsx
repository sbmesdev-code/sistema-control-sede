import { useState } from 'react'
import { LayoutDashboard, Package, ShoppingCart, Settings, Menu, Bell, Search, Layers, LogOut, Truck } from 'lucide-react'
import { Toaster } from 'sonner'
import { cn } from './lib/utils'
import { InventorySection } from './components/InventorySection'
import { SalesSection } from './components/SalesSection'
import { PromotionsSection } from './components/PromotionsSection'
import { SettingsSection } from './components/SettingsSection'
import { LogisticsSection } from './components/LogisticsSection'
import { DashboardSection } from './components/DashboardSection'
import { useInventoryStore } from './lib/store'
import { useSalesStore } from './lib/salesStore'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Login } from './pages/Login'
import { ChangePassword } from './pages/ChangePassword'
import { useSettingsStore } from './lib/settingsStore'
import { AccountingSection } from './components/AccountingSection'
import { useExpensesStore } from './lib/expensesStore' // Add import
import { PieChart } from 'lucide-react'
import { useEffect } from 'react'
import { InstallPrompt } from './components/InstallPrompt'

type View = 'DASHBOARD' | 'INVENTORY' | 'SALES' | 'PROMOTIONS' | 'LOGISTICS' | 'SETTINGS' | 'ACCOUNTING';

function AppContent() {
  const { user, userData, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [currentView, setCurrentView] = useState<View>('DASHBOARD')

  // Data Hooks
  const { initializeSubscription: initInventory } = useInventoryStore()
  const { initializeSubscription: initSales } = useSalesStore()
  const { initializeSubscription: initSettings } = useSettingsStore()
  const { initializeSubscription: initExpenses } = useExpensesStore()

  // Initialize Data Subscriptions
  useEffect(() => {
    // Only subscribe if authenticated
    if (!user) {
      // If not authenticated, ensure stores are clean so next login is fresh
      useInventoryStore.getState().cleanup();
      useSalesStore.getState().cleanup();
      useSettingsStore.getState().cleanup();
      return;
    }

    let unsubInventory = () => { };
    let unsubSales = () => { };
    let unsubSettings = () => { };
    let unsubExpenses = () => { };

    try {
      unsubInventory = initInventory();
      unsubSales = initSales();
      unsubSettings = initSettings();
      unsubExpenses = initExpenses();
    } catch (error) {
      console.error("Failed to initialize subscriptions:", error);
    }

    return () => {
      try {
        unsubInventory();
        unsubSales();
        unsubSettings();
        unsubExpenses();
      } catch (error) {
        console.error("Error cleaning up subscriptions:", error);
      }
    };
  }, [user, initInventory, initSales, initSettings, initExpenses]);



  // 1. Auth Guard
  if (!user) {
    return (
      <>
        <Login />
      </>
    );
  }

  // 2. Password Change Guard
  // We check if userData is loaded and flag is true
  if (userData?.requiresPasswordChange) {
    return <ChangePassword />;
  }

  return (
    <div className="h-screen bg-background text-foreground flex overflow-hidden">
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

        <nav className="p-4 space-y-2 flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
          <div className="flex-1 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
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
            <NavItem
              icon={<Truck size={20} />}
              label="Logística"
              isOpen={isSidebarOpen}
              active={currentView === 'LOGISTICS'}
              onClick={() => setCurrentView('LOGISTICS')}
            />
            <div className="pt-4 mt-4 border-t border-border">
              <NavItem
                icon={<PieChart size={20} />}
                label="Contable"
                isOpen={isSidebarOpen}
                active={currentView === 'ACCOUNTING'}
                onClick={() => setCurrentView('ACCOUNTING')}
              />
              <NavItem
                icon={<Settings size={20} />}
                label="Configuración"
                isOpen={isSidebarOpen}
                active={currentView === 'SETTINGS'}
                onClick={() => setCurrentView('SETTINGS')}
              />
            </div>
          </div>

          <div className="border-t border-border pt-2">
            <button
              onClick={logout}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 group relative hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
              )}>
              <span className="group-hover:text-destructive"><LogOut size={20} /></span>
              <span className={cn(
                "whitespace-nowrap transition-all duration-300 origin-left font-medium",
                !isSidebarOpen && "scale-0 w-0 opacity-0 overflow-hidden"
              )}>
                Cerrar Sesión
              </span>
            </button>
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
            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium leading-none">{userData?.name || user.email}</p>
                <p className="text-xs text-muted-foreground">Administrador</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium">
                {userData?.name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          {currentView === 'DASHBOARD' && (
            <DashboardSection />
          )}


          {currentView === 'INVENTORY' && (
            <InventorySection />
          )}


          {currentView === 'SALES' && (
            <SalesSection />
          )}

          {currentView === 'PROMOTIONS' && (
            <PromotionsSection />
          )}

          {currentView === 'PROMOTIONS' && (
            <PromotionsSection />
          )}

          {currentView === 'LOGISTICS' && (
            <LogisticsSection />
          )}

          {currentView === 'ACCOUNTING' && (
            <AccountingSection />
          )}

          {currentView === 'SETTINGS' && (
            <SettingsSection />
          )}
        </main>
      </div>
    </div>
  )
}


function App() {
  return (
    <AuthProvider>
      <Toaster richColors position="top-center" />
      <InstallPrompt />
      <AppContent />
    </AuthProvider>
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


export default App
