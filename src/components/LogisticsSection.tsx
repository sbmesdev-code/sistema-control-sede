import { useState, useEffect, useMemo } from 'react'
import { MapPin, X, Map as MapIcon, Download } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { useSettingsStore, type DistrictConfig } from '../lib/settingsStore'
import { useSalesStore } from '../lib/salesStore'
import { cn } from '../lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

// Zone Colors Configuration
const ZONE_COLORS: Record<string, string> = {
    'Lima Norte': 'bg-emerald-500',
    'Lima Sur': 'bg-orange-500',
    'Lima Este': 'bg-purple-500',
    'Lima Centro': 'bg-red-500',
    'Callao': 'bg-cyan-500',
    'Sin Zona': 'bg-gray-400'
};

const ZONE_BG_COLORS: Record<string, string> = {
    'Lima Norte': 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700',
    'Lima Sur': 'bg-orange-500/10 border-orange-500/20 text-orange-700',
    'Lima Este': 'bg-purple-500/10 border-purple-500/20 text-purple-700',
    'Lima Centro': 'bg-red-500/10 border-red-500/20 text-red-700',
    'Callao': 'bg-cyan-500/10 border-cyan-500/20 text-cyan-700',
    'Sin Zona': 'bg-gray-100 border-gray-200 text-gray-600'
};

// Componente de Fila Individual para mejor rendimiento
const DistrictCard = ({ dist, onUpdate, onToggle }: { dist: DistrictConfig, onUpdate: (name: string, config: Partial<DistrictConfig>) => void, onToggle: (name: string) => void }) => {
    const [doorPrice, setDoorPrice] = useState(dist.doorPrice.toString());
    const [meetupPrice, setMeetupPrice] = useState(dist.meetupPrice.toString());

    useEffect(() => {
        setDoorPrice(dist.doorPrice.toString());
    }, [dist.doorPrice]);

    useEffect(() => {
        setMeetupPrice(dist.meetupPrice.toString());
    }, [dist.meetupPrice]);

    const handleBlur = (field: 'doorPrice' | 'meetupPrice', value: string) => {
        const val = parseFloat(value);
        const current = field === 'doorPrice' ? dist.doorPrice : dist.meetupPrice;

        if (!isNaN(val) && val !== current) {
            onUpdate(dist.name, { [field]: val });
        } else {
            // Revert if invalid
            if (field === 'doorPrice') setDoorPrice(dist.doorPrice.toString());
            else setMeetupPrice(dist.meetupPrice.toString());
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.currentTarget.blur();
        }
    }

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
                "group relative flex flex-col p-3 rounded-xl border transition-all duration-200 hover:shadow-md bg-card",
                dist.allowDoorDelivery ? "border-border" : "opacity-70 bg-muted/30"
            )}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", ZONE_COLORS[dist.zone] || 'bg-gray-400')} />
                    <h4 className="font-bold text-sm text-foreground leading-tight">{dist.name}</h4>
                </div>
                <button
                    onClick={() => onToggle(dist.name)}
                    className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-bold transition-colors border",
                        dist.allowDoorDelivery
                            ? "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200"
                            : "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200"
                    )}
                >
                    {dist.allowDoorDelivery ? 'ACTIVO' : 'INACTIVO'}
                </button>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-auto">
                <div className="bg-muted/50 p-2 rounded-lg border border-border/50">
                    <label className="text-[9px] uppercase font-bold text-muted-foreground block mb-0.5">Punto</label>
                    <div className="flex items-baseline gap-0.5">
                        <span className="text-xs text-muted-foreground font-medium">S/</span>
                        <input
                            className="w-full bg-transparent font-bold text-sm focus:outline-none"
                            value={meetupPrice}
                            onChange={(e) => setMeetupPrice(e.target.value)}
                            onBlur={() => handleBlur('meetupPrice', meetupPrice)}
                            onKeyDown={handleKeyDown}
                        />
                    </div>
                </div>
                <div className="bg-primary/5 p-2 rounded-lg border border-primary/10">
                    <label className="text-[9px] uppercase font-bold text-primary/70 block mb-0.5">Puerta</label>
                    <div className="flex items-baseline gap-0.5">
                        <span className="text-xs text-primary/70 font-medium">S/</span>
                        <input
                            className="w-full bg-transparent font-bold text-sm text-primary focus:outline-none"
                            value={doorPrice}
                            onChange={(e) => setDoorPrice(e.target.value)}
                            onBlur={() => handleBlur('doorPrice', doorPrice)}
                            onKeyDown={handleKeyDown}
                        />
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export function LogisticsSection() { // exported as named export
    const { globalShippingBase, updateGlobalShipping, districts, updateDistrict, toggleDoorDelivery } = useSettingsStore()
    const { sales } = useSalesStore()
    const [selectedZone, setSelectedZone] = useState<string | null>(null)
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

    const filteredDistricts = useMemo(() => {
        if (!selectedZone) return [];
        return districts.filter(d => d.zone === selectedZone);
    }, [districts, selectedZone]);

    // Calculate stats per zone
    const zoneStats = useMemo(() => {
        const stats: Record<string, number> = {};
        districts.forEach(d => {
            stats[d.zone] = (stats[d.zone] || 0) + 1;
        });
        return stats;
    }, [districts]);

    // REPORT GENERATION LOGIC
    const handleDownloadReport = () => {
        try {
            if (!sales || sales.length === 0) {
                toast.error("No hay ventas registradas para generar el reporte");
                return;
            }

            // 1. Pending Orders (Not Completed, Not Cancelled)
            // Assuming 'PENDING' | 'PAID' | 'PROCESSING' are "Pending delivery"
            const pendingSales = sales.filter(s => ['PENDING', 'PAID', 'PROCESSING'].includes(s.status));

            // Group Pending by Zone -> District
            const pendingStats: Record<string, Record<string, number>> = {};

            pendingSales.forEach(sale => {
                const distName = sale.customer?.district || 'Desconocido';
                // Look up zone from settings, fallback to Unknown
                const distConfig = districts.find(d => d.name === distName);
                const zone = distConfig?.zone || 'Sin Zona';

                if (!pendingStats[zone]) pendingStats[zone] = {};
                if (!pendingStats[zone][distName]) pendingStats[zone][distName] = 0;
                pendingStats[zone][distName]++;
            });

            // 2. Historical Ranking (Completed Sales)
            const historicalSales = sales.filter(s => s.status === 'ENTREGADO' || s.status === 'COMPLETO' || s.status === 'ADELANTADO');

            const rankingStats: Record<string, number> = {};
            historicalSales.forEach(sale => {
                const distName = sale.customer?.district || 'Desconocido';
                rankingStats[distName] = (rankingStats[distName] || 0) + 1;
            });

            // Convert to CSV
            const csvRows = [];

            // Header 1
            csvRows.push(['REPORTE DE LOGISTICA Y ENVIOS']);
            csvRows.push([`Generado: ${new Date().toLocaleString()}`]);
            csvRows.push([]);

            // Section 1: Pending
            csvRows.push(['SECCION 1: PEDIDOS PENDIENTES POR ZONA']);
            csvRows.push(['ZONA', 'DISTRITO', 'CANTIDAD PENDIENTE']);

            Object.keys(pendingStats).sort().forEach(zone => {
                const zoneDistricts = pendingStats[zone];
                Object.keys(zoneDistricts).sort().forEach(dist => {
                    csvRows.push([zone, dist, zoneDistricts[dist]]);
                });
            });
            csvRows.push([]);

            // Section 2: Historical
            csvRows.push(['SECCION 2: RANKING HISTORICO (VENTAS COMPLETADAS)']);
            csvRows.push(['RANKING', 'DISTRITO', 'TOTAL ENTREGADOS']);

            Object.entries(rankingStats)
                .sort(([, a], [, b]) => b - a) // Sort DESC
                .forEach(([dist, count], index) => {
                    csvRows.push([index + 1, dist, count]);
                });

            // Download Logic
            const csvContent = "data:text/csv;charset=utf-8,"
                + csvRows.map(e => e.join(",")).join("\n");

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `reporte_logistica_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast.success("Reporte descargado correctamente");

        } catch (e) {
            console.error("Error generating report:", e);
            toast.error("Error al generar el reporte");
        }
    };

    // Helper to render zone button in map
    const ZoneButton = ({ zone, className, label }: { zone: string, className?: string, label?: string }) => {
        const isSelected = selectedZone === zone;
        const count = zoneStats[zone] || 0;
        const colorClass = ZONE_COLORS[zone] || 'bg-gray-400';

        return (
            <button
                onClick={() => setSelectedZone(isSelected ? null : zone)}
                className={cn(
                    "relative flex flex-col items-center justify-center p-2 transition-all duration-300 rounded-xl border-2 hover:brightness-110 shadow-sm",
                    isSelected ? "border-foreground scale-105 z-10 shadow-xl" : "border-white/20 opacity-90 hover:opacity-100 hover:scale-[1.02]",
                    colorClass,
                    "text-white",
                    className
                )}
            >
                <div className="font-black tracking-tight text-lg drop-shadow-md">{label || zone.replace('Lima ', '')}</div>
                <div className="text-[10px] font-medium bg-black/20 px-2 py-0.5 rounded-full backdrop-blur-sm mt-1">
                    {count} distritos
                </div>
                {isSelected && (
                    <div className="absolute -bottom-2 bg-foreground text-background text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg animate-in fade-in zoom-in duration-200">
                        VER LISTA
                    </div>
                )}
            </button>
        )
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Mapa Logístico</h2>
                    <p className="text-muted-foreground mt-1">Gestiona cobertura, tarifas y descarga reportes.</p>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        onClick={handleDownloadReport}
                        variant="outline"
                        className="gap-2 border-emerald-500/20 hover:bg-emerald-50 text-emerald-700 h-10"
                    >
                        <Download className="w-4 h-4" />
                        Descargar Reporte
                    </Button>

                    {/* Global Config Card */}
                    <div className="bg-card border border-border rounded-xl px-4 py-2 flex items-center gap-4 shadow-sm h-10">
                        <div className="text-right">
                            <label className="text-xs font-semibold text-muted-foreground block">Tarifa Base</label>
                        </div>
                        <div className="relative w-20">
                            <span className="absolute left-2 top-1.5 text-xs text-muted-foreground font-bold">S/</span>
                            <Input
                                className="pl-6 font-bold h-8 bg-muted/50 border-transparent focus:bg-background"
                                value={basePriceInput}
                                onChange={(e) => setBasePriceInput(e.target.value)}
                                onBlur={handleBasePriceBlur}
                                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* SCHEMATIC MAP CONTAINER */}
            <div className="w-full max-w-4xl mx-auto aspect-[16/9] md:aspect-[2/1] bg-slate-50/50 dark:bg-slate-900/50 rounded-[2rem] p-4 relative shadow-sm border border-border/40 overflow-hidden">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }}
                />

                {/* CSS Grid for Map Layout - 3 Rows Full Width */}
                <div className="grid grid-cols-3 grid-rows-3 gap-3 h-full w-full max-w-3xl mx-auto">

                    {/* LIMA NORTE: Row 1 (Full Width) */}
                    <div className="col-span-3 row-start-1">
                        <ZoneButton zone="Lima Norte" className="h-full rounded-2xl w-full" label="LIMA NORTE" />
                    </div>

                    {/* Row 2: CALLAO - CENTRO - ESTE */}
                    <div className="col-start-1 row-start-2">
                        <ZoneButton zone="Callao" className="h-full rounded-2xl w-full" label="CALLAO" />
                    </div>
                    <div className="col-start-2 row-start-2">
                        <ZoneButton zone="Lima Centro" className="h-full rounded-2xl w-full" label="LIMA CENTRO" />
                    </div>
                    <div className="col-start-3 row-start-2">
                        <ZoneButton zone="Lima Este" className="h-full rounded-2xl w-full" label="LIMA ESTE" />
                    </div>

                    {/* Row 3: SUR (Full Width) */}
                    <div className="col-span-3 row-start-3">
                        <ZoneButton zone="Lima Sur" className="h-full rounded-2xl w-full" label="LIMA SUR" />
                    </div>
                </div>
            </div>

            {/* DETAIL VIEW */}
            <AnimatePresence mode="wait">
                {selectedZone ? (
                    <motion.div
                        key={selectedZone}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-4"
                    >
                        <div className={cn("flex items-center gap-3 px-4 py-3 rounded-xl border border-border/50", ZONE_BG_COLORS[selectedZone] || 'bg-gray-100')}>
                            <MapPin className="w-5 h-5" />
                            <h3 className="text-xl font-black uppercase tracking-tight">{selectedZone}</h3>
                            <span className="bg-white/50 px-2 py-0.5 rounded-full text-xs font-bold border border-black/5">
                                {filteredDistricts.length} Distritos
                            </span>
                            <div className="ml-auto">
                                <Button variant="ghost" size="sm" onClick={() => setSelectedZone(null)} className="h-8 text-xs hover:bg-black/5">
                                    <X className="w-3 h-3 mr-1" /> Cerrar
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {filteredDistricts.map(dist => (
                                <DistrictCard
                                    key={dist.name}
                                    dist={dist}
                                    onUpdate={updateDistrict}
                                    onToggle={toggleDoorDelivery}
                                />
                            ))}
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.5 }}
                        className="text-center py-12"
                    >
                        <MapIcon className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                        <h3 className="text-xl font-medium text-muted-foreground">Selecciona una zona en el mapa</h3>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
