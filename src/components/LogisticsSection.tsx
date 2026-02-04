import { useState, useEffect } from 'react'
import { Search, MapPin, Check, X, Package } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { useSettingsStore } from '../lib/settingsStore'
import { cn } from '../lib/utils'

// Componente de Fila Individual para mejor rendimiento (evita re-render global al escribir)
const DistrictCard = ({ dist, onUpdate, onToggle }: { dist: any, onUpdate: (name: string, val: number) => void, onToggle: (name: string) => void }) => {
    const [price, setPrice] = useState(dist.basePrice.toString());
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        if (!isFocused) {
            setPrice(dist.basePrice.toString());
        }
    }, [dist.basePrice]); // Removed isFocused to prevent revert on blur

    const handleBlur = () => {
        setIsFocused(false);
        const val = parseFloat(price);
        if (!isNaN(val) && val !== dist.basePrice) {
            onUpdate(dist.name, val);
        } else {
            setPrice(dist.basePrice.toString());
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.currentTarget.blur();
        }
    }

    return (
        <div className={cn(
            "group relative flex items-center justify-between p-4 rounded-xl border transition-all duration-200",
            dist.allowDoorDelivery
                ? "bg-card border-border hover:border-emerald-500/30 hover:shadow-md"
                : "bg-muted/30 border-transparent hover:bg-muted/50"
        )}>
            <div className="flex items-center gap-4">
                <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center transition-colors",
                    dist.allowDoorDelivery ? "bg-emerald-100 text-emerald-600" : "bg-gray-200 text-gray-500"
                )}>
                    <MapPin className="h-5 w-5" />
                </div>
                <div>
                    <h4 className="font-semibold text-foreground">{dist.name}</h4>
                    <span className="text-xs font-medium text-muted-foreground bg-accent px-2 py-0.5 rounded-full">
                        {dist.department}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="text-right">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Costo Envío</label>
                    <div className="relative">
                        <span className="absolute left-2 top-1.5 text-xs text-muted-foreground font-bold">S/</span>
                        <Input
                            className="h-8 w-20 pl-6 text-right font-bold bg-background shadow-sm focus:ring-primary/20"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            onBlur={handleBlur}
                            onFocus={() => setIsFocused(true)}
                            onKeyDown={handleKeyDown}
                        />
                    </div>
                </div>

                <div className="text-center w-24">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                        {dist.allowDoorDelivery ? 'A Puerta' : 'Solo Encuentro'}
                    </label>
                    <Button
                        variant={dist.allowDoorDelivery ? "default" : "secondary"}
                        size="sm"
                        onClick={() => onToggle(dist.name)}
                        className={cn(
                            "w-full h-8 transition-all",
                            dist.allowDoorDelivery ? "bg-emerald-600 hover:bg-emerald-700" : "bg-muted-foreground/20 hover:bg-muted-foreground/30 text-muted-foreground"
                        )}
                    >
                        {dist.allowDoorDelivery ? (
                            <><Check className="w-3 h-3 mr-1" /> Activo</>
                        ) : (
                            <><X className="w-3 h-3 mr-1" /> Restringido</>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export function LogisticsSection() {
    const { globalShippingBase, updateGlobalShipping, districts, updateDistrict, toggleDoorDelivery } = useSettingsStore()
    const [searchTerm, setSearchTerm] = useState('')
    const [basePriceInput, setBasePriceInput] = useState(globalShippingBase.toString())

    // Update local shipping input when store changes
    useEffect(() => {
        setBasePriceInput(globalShippingBase.toString());
    }, [globalShippingBase]);

    const handleBasePriceBlur = () => {
        const val = parseFloat(basePriceInput);
        if (!isNaN(val) && val !== globalShippingBase) {
            updateGlobalShipping(val);
        }
    }

    const filteredDistricts = districts.filter(d =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.department.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const limaDistricts = filteredDistricts.filter(d => d.department === 'LIMA');
    const callaoDistricts = filteredDistricts.filter(d => d.department === 'CALLAO');

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Logística y Envíos</h2>
                    <p className="text-muted-foreground mt-1 text-lg">Gestiona la cobertura y tarifas de entrega.</p>
                </div>

                {/* Global Config Card */}
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-4 shadow-sm">
                    <div className="bg-primary/20 p-3 rounded-full text-primary">
                        <Package className="h-6 w-6" />
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-foreground block">Tarifa Base Global</label>
                        <p className="text-xs text-muted-foreground mb-1">Precio por defecto para nuevos destinos</p>
                    </div>
                    <div className="relative w-24 ml-2">
                        <span className="absolute left-3 top-2 text-sm text-foreground font-bold">S/</span>
                        <Input
                            className="pl-8 font-bold text-lg h-10 bg-white border-primary/30 focus:border-primary"
                            value={basePriceInput}
                            onChange={(e) => setBasePriceInput(e.target.value)}
                            onBlur={handleBasePriceBlur}
                            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                        />
                    </div>
                </div>
            </div>

            {/* Search & Stats */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md py-4 border-b border-border mb-6">
                <div className="relative max-w-2xl">
                    <Search className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
                    <Input
                        placeholder="Buscar distrito (ej. Miraflores)..."
                        className="pl-12 h-12 text-lg rounded-full shadow-sm border-muted-foreground/20 hover:border-primary/50 transition-colors"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* District Lists */}
            <div className="grid lg:grid-cols-2 gap-8">
                {/* LIMA Column */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300">Lima Metropolitana</h3>
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-bold">{limaDistricts.length}</span>
                    </div>
                    <div className="space-y-3">
                        {limaDistricts.map(dist => (
                            <DistrictCard
                                key={dist.name}
                                dist={dist}
                                onUpdate={(name, val) => updateDistrict(name, { basePrice: val })}
                                onToggle={toggleDoorDelivery}
                            />
                        ))}
                        {limaDistricts.length === 0 && <p className="text-muted-foreground italic p-4">No se encontraron distritos.</p>}
                    </div>
                </div>

                {/* CALLAO Column */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300">Callao</h3>
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-bold">{callaoDistricts.length}</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-1 border border-dashed border-slate-300 dark:border-slate-700">
                        <div className="space-y-3 p-3">
                            {callaoDistricts.map(dist => (
                                <DistrictCard
                                    key={dist.name}
                                    dist={dist}
                                    onUpdate={(name, val) => updateDistrict(name, { basePrice: val })}
                                    onToggle={toggleDoorDelivery}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
