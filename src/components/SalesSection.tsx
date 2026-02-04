import { useState } from 'react'
import { ShoppingCart, LayoutDashboard, Tag } from 'lucide-react'
import { Button } from './ui/button'
import { POS } from './sales/POS'
import { SalesList } from './sales/SalesList'
import { PromotionsSection } from './PromotionsSection'

export function SalesSection() {
    const [view, setView] = useState<'POS' | 'LIST' | 'PROMOTIONS'>('POS')

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex gap-2 bg-muted p-1 rounded-lg">
                    <Button
                        variant={view === 'POS' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setView('POS')}
                        className="gap-2"
                    >
                        <ShoppingCart className="h-4 w-4" /> Punto de Venta
                    </Button>
                    <Button
                        variant={view === 'LIST' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setView('LIST')}
                        className="gap-2"
                    >
                        <LayoutDashboard className="h-4 w-4" /> Historial de Ventas
                    </Button>
                    <Button
                        variant={view === 'PROMOTIONS' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setView('PROMOTIONS')}
                        className="gap-2"
                    >
                        <Tag className="h-4 w-4" /> Gestor Descuentos
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                {view === 'POS' && <POS />}
                {view === 'LIST' && <SalesList />}
                {view === 'PROMOTIONS' && <PromotionsSection />}
            </div>
        </div>
    )
}


