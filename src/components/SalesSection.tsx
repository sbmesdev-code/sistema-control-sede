import { useState } from 'react'
import { ShoppingCart, LayoutDashboard, Tag, WalletCards } from 'lucide-react'
import { POS } from './sales/POS'
import { SalesList } from './sales/SalesList'
import { PromotionsSection } from './PromotionsSection'
import { cn } from '../lib/utils'
import { motion } from 'framer-motion'

type ViewType = 'POS' | 'LIST' | 'PROMOTIONS';

export function SalesSection() {
    const [view, setView] = useState<ViewType>('POS')

    const tabs: { id: ViewType; label: string; icon: React.ElementType }[] = [
        { id: 'POS', label: 'Punto de Venta', icon: ShoppingCart },
        { id: 'LIST', label: 'Historial', icon: LayoutDashboard },
        { id: 'PROMOTIONS', label: 'Promociones', icon: Tag },
    ]

    return (
        <div className="h-full flex flex-col bg-background/50 backdrop-blur-sm overflow-hidden">
            {/* Header / Tabs */}
            <div className="flex-none px-6 py-4 border-b border-border/50 bg-background/50 backdrop-blur-md z-10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="bg-primary/10 p-2 rounded-xl text-primary">
                        <WalletCards className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold tracking-tight">Gestión de Ventas</h2>
                        <p className="text-xs text-muted-foreground font-medium">Administra transacciones y promociones</p>
                    </div>
                </div>

                <div className="flex p-1 bg-muted/50 rounded-xl border border-border/50">
                    {tabs.map((tab) => {
                        const isActive = view === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setView(tab.id)}
                                className={cn(
                                    "relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-2 z-0",
                                    isActive ? "text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute inset-0 bg-primary rounded-lg -z-10"
                                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                    />
                                )}
                                <tab.icon className={cn("w-4 h-4", isActive ? "text-primary-foreground" : "")} />
                                {tab.label}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative">
                <div className="absolute inset-0 overflow-y-auto">
                    {view === 'POS' && <POS />}
                    {view === 'LIST' && <div className="h-full p-6"><SalesList /></div>}
                    {view === 'PROMOTIONS' && <div className="h-full p-6"><PromotionsSection /></div>}
                </div>
            </div>
        </div>
    )
}
