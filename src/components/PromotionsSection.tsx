import { useState, useMemo } from 'react'
import { Plus, Tag, Trash2, Power, Save, X } from 'lucide-react'
import { useSalesStore } from '../lib/salesStore'
import { useInventoryStore } from '../lib/store'
import { Button } from './ui/button'
import { Input } from './ui/input'
import type { PromotionRule, PromotionScope, PromotionType } from '../types/sales'
import { toast } from 'sonner'
import { ConfirmDialog } from './ConfirmDialog'

export function PromotionsSection() {
    const { promotions, addPromotion, togglePromotion, removePromotion } = useSalesStore()
    const { products } = useInventoryStore()
    const [isCreating, setIsCreating] = useState(false)

    // Form State
    const [name, setName] = useState('')
    const [type, setType] = useState<PromotionType>('PERCENTAGE')
    const [value, setValue] = useState('')
    const [scope, setScope] = useState<PromotionScope>('COLLECTION')
    const [target, setTarget] = useState('')

    // Dialog State
    const [deleteId, setDeleteId] = useState<string | null>(null)

    // Derived unique options for Target dropdown
    const targetOptions = useMemo(() => {
        if (scope === 'GLOBAL') return [];
        const options = new Set<string>();

        products.forEach(p => {
            if (scope === 'COLLECTION') options.add(p.collection);
            if (scope === 'TYPE') options.add(p.type);
            if (scope === 'GENDER') options.add(p.gender);
            if (scope === 'PRODUCT') options.add(p.name);
        });

        return Array.from(options).sort();
    }, [products, scope]);

    const handleSave = () => {
        if (!name || !value || (scope !== 'GLOBAL' && !target)) {
            toast.warning('Por favor complete todos los campos requeridos.')
            return
        }

        const newRule: PromotionRule = {
            id: crypto.randomUUID(),
            name,
            type,
            value: parseFloat(value),
            scope,
            target: target.toUpperCase(),
            isActive: true
        }

        addPromotion(newRule)
        toast.success('Promoción creada exitosamente')
        setIsCreating(false)
        resetForm()
    }

    const resetForm = () => {
        setName('')
        setValue('')
        setTarget('')
        setScope('COLLECTION')
        setType('PERCENTAGE')
    }

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Tag className="h-8 w-8 text-primary" /> Gestor de Promociones
                    </h2>
                    <p className="text-muted-foreground mt-1">Configura reglas de descuento automáticas para tus ventas.</p>
                </div>
                <Button onClick={() => setIsCreating(true)} size="lg" className={isCreating ? 'hidden' : ''}>
                    <Plus className="mr-2 h-5 w-5" /> Nueva Regla
                </Button>
            </div>

            {/* Creation Form */}
            {isCreating && (
                <div className="bg-muted/30 border border-primary/20 rounded-xl p-6 shadow-sm animate-in fade-in slide-in-from-top-4">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-lg font-semibold text-primary">Nueva Regla de Descuento</h3>
                        <Button variant="ghost" size="sm" onClick={() => setIsCreating(false)}><X className="h-4 w-4" /></Button>
                    </div>

                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-4 space-y-2">
                            <label className="text-xs font-medium uppercase text-muted-foreground">Nombre de la Promoción</label>
                            <Input
                                placeholder="Ej: Liquidación Verano 2026"
                                value={name} onChange={e => setName(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <div className="col-span-2 space-y-2">
                            <label className="text-xs font-medium uppercase text-muted-foreground">Tipo</label>
                            <select
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none"
                                value={type} onChange={e => setType(e.target.value as PromotionType)}
                            >
                                <option value="PERCENTAGE">Porcentaje (%)</option>
                                <option value="FIXED_AMOUNT">Monto Fijo (S/)</option>
                            </select>
                        </div>

                        <div className="col-span-2 space-y-2">
                            <label className="text-xs font-medium uppercase text-muted-foreground">Valor</label>
                            <div className="relative">
                                <Input
                                    type="number"
                                    placeholder="0"
                                    className="pl-8"
                                    value={value} onChange={e => setValue(e.target.value)}
                                />
                                <span className="absolute left-3 top-2.5 text-xs font-bold text-muted-foreground">
                                    {type === 'PERCENTAGE' ? '%' : 'S/'}
                                </span>
                            </div>
                        </div>

                        <div className="col-span-2 space-y-2">
                            <label className="text-xs font-medium uppercase text-muted-foreground">Alcance (Scope)</label>
                            <select
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none"
                                value={scope} onChange={e => {
                                    setScope(e.target.value as PromotionScope);
                                    setTarget(''); // Reset target on scope change
                                }}
                            >
                                <option value="GLOBAL">Toda la Tienda</option>
                                <option value="COLLECTION">Por Colección</option>
                                <option value="TYPE">Por Tipo</option>
                                <option value="GENDER">Por Género</option>
                                <option value="PRODUCT">Por Nombre Producto</option>
                            </select>
                        </div>

                        <div className="col-span-2 space-y-2">
                            <label className="text-xs font-medium uppercase text-muted-foreground">Objetivo</label>
                            {scope === 'GLOBAL' ? (
                                <Input disabled value="Todos" className="opacity-50" />
                            ) : (
                                <select
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none"
                                    value={target}
                                    onChange={e => setTarget(e.target.value)}
                                >
                                    <option value="">Seleccionar...</option>
                                    {targetOptions.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsCreating(false)}>Cancelar</Button>
                        <Button onClick={handleSave} className="bg-primary text-primary-foreground hover:bg-primary/90">
                            <Save className="mr-2 h-4 w-4" /> Guardar Regla
                        </Button>
                    </div>
                </div>
            )}

            {/* Rules List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pb-10">
                {promotions.map(rule => (
                    <div
                        key={rule.id}
                        className={`
                            relative group border rounded-xl p-5 transition-all
                            ${rule.isActive
                                ? 'bg-card border-l-4 border-l-primary shadow-sm hover:shadow-md'
                                : 'bg-muted/40 border-l-4 border-l-muted opacity-70 grayscale-[0.5]'}
                        `}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h4 className="font-bold text-lg">{rule.name}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-accent rounded text-muted-foreground tracking-wider">
                                        {rule.scope} {rule.scope !== 'GLOBAL' && `• ${rule.target}`}
                                    </span>
                                </div>
                            </div>
                            <Button
                                variant={rule.isActive ? "default" : "secondary"}
                                size="icon"
                                className={`h-8 w-8 rounded-full transition-colors ${rule.isActive ? 'bg-green-500 hover:bg-green-600' : ''}`}
                                onClick={() => togglePromotion(rule.id)}
                            >
                                <Power className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="mt-4 flex items-baseline gap-1">
                            <span className="text-3xl font-black text-foreground">
                                {rule.type === 'PERCENTAGE' ? `${rule.value}%` : `S/ ${rule.value}`}
                            </span>
                            <span className="text-sm font-medium text-muted-foreground uppercase">
                                DESCUENTO
                            </span>
                        </div>

                        <div className="mt-4 pt-4 border-t border-border/50 flex justify-between items-center text-xs text-muted-foreground">
                            <span>Estado: <b className={rule.isActive ? "text-green-600" : "text-muted-foreground"}>{rule.isActive ? 'ACTIVO' : 'INACTIVO'}</b></span>
                            <button
                                onClick={() => setDeleteId(rule.id)}
                                className="flex items-center gap-1 hover:text-destructive transition-colors"
                            >
                                <Trash2 className="h-3 w-3" /> Eliminar
                            </button>
                        </div>
                    </div>
                ))}

                {promotions.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center p-12 text-muted-foreground opacity-50 border-2 border-dashed border-border rounded-xl">
                        <Tag className="h-12 w-12 mb-2" />
                        <p>No hay reglas de promoción activas</p>
                    </div>
                )}
            </div>

            <ConfirmDialog
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={() => {
                    if (deleteId) {
                        removePromotion(deleteId);
                        toast.success("Promoción eliminada");
                    }
                }}
                title="Eliminar Promoción"
                message="¿Estás seguro de que deseas eliminar esta regla de descuento de forma permanente?"
                confirmText="Sí, Eliminar"
                variant="danger"
            />
        </div>
    )
}
