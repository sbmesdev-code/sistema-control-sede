import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { Plus, Trash2 } from 'lucide-react'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { generateBaseSKU, generateVariantSKU } from '../../lib/sku'
import type { ProductFormData, Product } from '../../types/inventory'
import { useInventoryStore } from '../../lib/store'

interface ProductFormProps {
    initialData?: Product;
    onComplete?: () => void;
}

export function ProductForm({ initialData, onComplete }: ProductFormProps) {
    const addProduct = useInventoryStore(state => state.addProduct)
    const updateProduct = useInventoryStore(state => state.updateProduct)

    const { register, control, watch, handleSubmit, reset, setValue } = useForm<ProductFormData>({
        defaultValues: {
            collection: 'VERANO',
            gender: 'UNISEX',
            variants: []
        }
    })

    // Load initial data if editing
    useEffect(() => {
        if (initialData) {
            reset({
                name: initialData.name,
                collection: initialData.collection,
                type: initialData.type,
                gender: initialData.gender,
                variants: initialData.variants.map(v => ({
                    id: v.id,
                    color: v.color,
                    size: v.size,
                    stock: v.stock,
                    priceProduction: v.priceProduction,
                    priceRetail: v.priceRetail,
                    images: [] as File[] // Force empty File array for form
                }))
            });
            setBaseSKU(initialData.baseCode);
        } else {
            // Reset form when switching to create mode
            reset({
                name: '',
                collection: 'VERANO',
                type: '',
                gender: 'UNISEX',
                variants: []
            });
            setBaseSKU('');
        }
    }, [initialData, reset]);

    // Watch fields for SKU generation
    const watchedName = watch('name')
    const watchedType = watch('type')
    const watchedCollection = watch('collection')
    const watchedGender = watch('gender')

    const [baseSKU, setBaseSKU] = useState('')

    useEffect(() => {
        if (watchedName && watchedType) {
            const sku = generateBaseSKU(watchedCollection, watchedType, watchedGender, watchedName)
            setBaseSKU(sku)
        }
    }, [watchedName, watchedType, watchedCollection, watchedGender])

    const { fields, append, remove } = useFieldArray({
        control,
        name: "variants"
    })

    const onSubmit = async (data: ProductFormData) => {
        if (initialData) {
            // Update existing product
            updateProduct(initialData.id, {
                name: data.name,
                collection: data.collection,
                type: data.type,
                gender: data.gender,
                baseCode: generateBaseSKU(data.collection, data.type, data.gender, data.name),
                variants: data.variants.map(v => ({
                    id: v.id || crypto.randomUUID(),
                    sku: generateVariantSKU(
                        generateBaseSKU(data.collection, data.type, data.gender, data.name),
                        v.color,
                        v.size
                    ),
                    color: v.color,
                    size: v.size,
                    stock: v.stock,
                    priceProduction: v.priceProduction,
                    priceRetail: v.priceRetail,
                    images: [] as string[] // Force empty string array for store
                }))
            });
            // alert("Producto actualizado exitosamente"); // Store handles toast
        } else {
            // Create new product
            const newProduct = {
                id: crypto.randomUUID(),
                name: data.name,
                collection: data.collection,
                type: data.type,
                gender: data.gender,
                baseCode: generateBaseSKU(data.collection, data.type, data.gender, data.name),
                updatedAt: Date.now(),
                createdAt: Date.now(),
                variants: data.variants.map((v) => ({
                    id: crypto.randomUUID(),
                    sku: generateVariantSKU(
                        generateBaseSKU(data.collection, data.type, data.gender, data.name),
                        v.color,
                        v.size
                    ),
                    color: v.color,
                    size: v.size,
                    stock: v.stock,
                    priceProduction: v.priceProduction,
                    priceRetail: v.priceRetail,
                    images: [] as string[] // Force empty string array for store
                }))
            };
            try {
                await addProduct(newProduct);
                // Alert handled by store toast
            } catch (error) {
                console.error("Error UI saving product:", error);
                // Keep form open if error
                return;
            }
        }

        if (onComplete) {
            onComplete();
        } else {
            reset();
            setBaseSKU('');
        }
    }

    return (
        <div className="max-w-7xl mx-auto p-8">

            <div className="flex items-center justify-between mb-10">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{initialData ? 'Editar Producto' : 'Registro de Producto'}</h2>
                    <p className="text-muted-foreground mt-1 text-lg">{initialData ? 'Modifica los datos del producto seleccionado.' : 'Sigue los 3 pasos para dar de alta un nuevo ítem.'}</p>
                </div>
                <div className="bg-card border border-border px-6 py-3 rounded-xl shadow-sm flex items-center gap-4">
                    <div className="text-right">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">SKU PRELIMINAR</span>
                        <span className="text-2xl font-mono font-bold text-primary">{baseSKU || '---'}</span>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

                {/* Step 1: Datos Generales */}
                <section className="bg-card rounded-xl border border-border shadow-sm overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-primary/20"></div>
                    <div className="p-8">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-lg shadow-lg shadow-primary/20">1</div>
                            <h3 className="text-xl font-semibold">Definición General</h3>
                        </div>

                        <div className="grid grid-cols-12 gap-8 pl-14">
                            <div className="col-span-8 space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Nombre Comercial</label>
                                    <Input {...register('name')} placeholder="Ej. Polo Oversize 'Urban'" className="h-12 text-lg" autoFocus />
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Tipo de Prenda</label>
                                        <Input {...register('type')} placeholder="Ej. POLO" className="h-11 font-mono uppercase" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Género</label>
                                        <select {...register('gender')} className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                                            <option value="UNISEX">Unisex</option>
                                            <option value="HOMBRE">Hombre</option>
                                            <option value="MUJER">Mujer</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Visual Guide */}
                            <div className="col-span-4 bg-muted/30 rounded-lg border border-border/50 p-6 flex flex-col justify-center items-center text-center">
                                <span className="text-sm text-muted-foreground mb-2">Tu SKU comienza con:</span>
                                <div className="text-3xl font-mono font-black text-muted-foreground/50 tracking-widest">
                                    {baseSKU ? baseSKU.split('-').slice(0, 4).join('-') : '????'}
                                </div>
                                <p className="text-xs text-muted-foreground mt-4">
                                    Se usan las 3 primeras letras de la colección, tipo, género y nombre.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Step 2: Colección */}
                <section className="bg-card rounded-xl border border-border shadow-sm overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-primary/40"></div>
                    <div className="p-8">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-lg shadow-lg shadow-primary/20">2</div>
                            <h3 className="text-xl font-semibold">Temporada y Colección</h3>
                        </div>

                        <div className="pl-14 max-w-2xl">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nombre de la Colección</label>
                                <div className="flex gap-4">
                                    <Input
                                        {...register('collection')}
                                        placeholder="Escribe el nombre de la colección..."
                                        className="h-12 flex-1"
                                        list="collections-list"
                                    />
                                    <div className="h-12 w-24 bg-accent rounded-md flex items-center justify-center font-mono font-bold text-muted-foreground border border-input" title="Código de Colección">
                                        {watch('collection') ? (watch('collection').slice(0, 3).toUpperCase()) : '---'}
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground">Tip: Si escribes "Verano 2026", el código será "VER".</p>
                                <datalist id="collections-list">
                                    <option value="VERANO" />
                                    <option value="INVIERNO" />
                                    <option value="ANADIBLES" />
                                </datalist>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Step 3: Variantes */}
                <section className="bg-card rounded-xl border border-border shadow-sm overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-primary"></div>
                    <div className="p-8">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-lg shadow-lg shadow-primary/20">3</div>
                                <h3 className="text-xl font-semibold">Variantes (Colores y Tallas)</h3>
                            </div>
                            <Button type="button" onClick={() => append({ color: '', size: '', priceProduction: 0, priceRetail: 0, stock: 0, images: [] })}>
                                <Plus className="mr-2 h-4 w-4" /> Agregar Nueva Variante
                            </Button>
                        </div>

                        <div className="pl-14 space-y-4">
                            {/* Global Settings for Variants */}
                            {fields.length > 0 && (
                                <div className="bg-muted/40 p-4 rounded-lg flex items-center gap-4 text-sm mb-4 border border-border/50">
                                    <span className="font-semibold text-muted-foreground whitespace-nowrap">Aplicar a todos:</span>
                                    <div className="flex gap-4 flex-1">
                                        <div className="flex items-center gap-2">
                                            <label className="text-xs text-muted-foreground">Costo Producción</label>
                                            <Input
                                                type="number"
                                                className="h-8 w-24 bg-background"
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value);
                                                    if (!isNaN(val)) {
                                                        fields.forEach((_, idx) => setValue(`variants.${idx}.priceProduction`, val));
                                                    }
                                                }}
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <label className="text-xs text-muted-foreground">Precio Venta</label>
                                            <Input
                                                type="number"
                                                className="h-8 w-24 bg-background"
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value);
                                                    if (!isNaN(val)) {
                                                        fields.forEach((_, idx) => setValue(`variants.${idx}.priceRetail`, val));
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="text-xs text-muted-foreground italic">
                                        Escribe aquí para actualizar todas las variantes a la vez.
                                    </div>
                                </div>
                            )}

                            {fields.map((field, index) => (
                                <div key={field.id} className="bg-accent/10 border border-border rounded-xl p-5 hover:border-primary/40 transition-all">
                                    <div className="grid grid-cols-12 gap-6 items-end">
                                        {/* Color & Size */}
                                        <div className="col-span-4 space-y-2">
                                            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Variante</label>
                                            <div className="flex gap-2">
                                                <Input {...register(`variants.${index}.color`)} placeholder="Color" className="font-medium" />
                                                <Input {...register(`variants.${index}.size`)} placeholder="Talla" className="w-20 font-medium text-center" />
                                            </div>
                                        </div>

                                        {/* Prices */}
                                        <div className="col-span-4 space-y-2">
                                            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Estructura de Costos</label>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] text-muted-foreground block">Costo Producción</label>
                                                    <div className="relative">
                                                        <span className="absolute left-2 top-2.5 text-xs text-muted-foreground">S/</span>
                                                        <Input type="number" {...register(`variants.${index}.priceProduction`, { valueAsNumber: true })} className="pl-6 text-sm" placeholder="0.00" />
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] text-primary font-bold block">Precio al Público</label>
                                                    <div className="relative">
                                                        <span className="absolute left-2 top-2.5 text-xs text-primary font-bold">S/</span>
                                                        <Input type="number" {...register(`variants.${index}.priceRetail`, { valueAsNumber: true })} className="pl-6 text-sm font-bold border-primary/20 bg-primary/5" placeholder="0.00" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Stock */}
                                        <div className="col-span-3 space-y-2">
                                            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Stock</label>
                                            <Input type="number" {...register(`variants.${index}.stock`, { valueAsNumber: true })} className="text-center" />
                                        </div>

                                        {/* Actions */}
                                        <div className="col-span-1 flex justify-end">
                                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-muted-foreground hover:text-destructive">
                                                <Trash2 className="h-5 w-5" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-border/50 flex justify-between items-center">
                                        <div className="text-xs font-mono text-muted-foreground">
                                            SKU FINAL: <span className="text-foreground bg-accent px-1.5 py-0.5 rounded">{baseSKU ? generateVariantSKU(baseSKU, watch(`variants.${index}.color`), watch(`variants.${index}.size`)) : '...'}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {fields.length === 0 && (
                                <div className="text-center py-10 bg-accent/5 rounded-xl border border-dashed border-border">
                                    <p className="text-muted-foreground">No has agregado variantes todavía.</p>
                                    <Button variant="link" onClick={() => append({ color: 'Unico', size: 'U', priceProduction: 0, priceRetail: 0, stock: 0, images: [] })}>
                                        + Agregar primera variante
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                <div className="flex justify-end pt-6 gap-4">
                    <Button type="button" variant="outline" size="lg" className="px-8" onClick={onComplete}>Cancelar</Button>
                    <Button type="submit" size="lg" className="px-10 text-lg shadow-lg shadow-primary/20">{initialData ? 'Actualizar' : 'Registrar'} Producto</Button>
                </div>

            </form>
        </div>
    )
}
