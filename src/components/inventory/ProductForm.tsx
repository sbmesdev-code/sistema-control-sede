import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { Plus, Trash2, Image as ImageIcon, X, Loader2, ArrowRight, ArrowLeft, Check, User, Users, Box, Tag, Layers } from 'lucide-react'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { generateBaseSKU, generateVariantSKU } from '../../lib/sku'
import type { ProductFormData, Product, Gender } from '../../types/inventory'
import { useInventoryStore } from '../../lib/store'
import { storage } from '../../lib/firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { toast } from 'sonner'
import { cn } from '../../lib/utils'

interface ProductFormProps {
    initialData?: Product;
    onComplete?: () => void;
}

export function ProductForm({ initialData, onComplete }: ProductFormProps) {
    const addProduct = useInventoryStore(state => state.addProduct)
    const updateProduct = useInventoryStore(state => state.updateProduct)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [step, setStep] = useState(1)
    const totalSteps = 3

    const { register, control, watch, handleSubmit, reset, setValue, getValues, trigger } = useForm<ProductFormData>({
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
                    colorCode: v.colorCode || '#000000',
                    size: v.size,
                    stock: v.stock,
                    priceProduction: v.priceProduction,
                    priceRetail: v.priceRetail,
                    images: v.images || []
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

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, variantIndex: number) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const currentImages = getValues(`variants.${variantIndex}.images`) || [];
            const newImages = Array.from(files);
            // Force re-render with shouldValidate
            setValue(`variants.${variantIndex}.images`, [...currentImages, ...newImages], {
                shouldValidate: true,
                shouldDirty: true,
                shouldTouch: true
            });
        }
        // Reset input value to allow selecting the same file again if needed
        e.target.value = '';
    };

    const removeImage = (variantIndex: number, imageIndex: number) => {
        const currentImages = getValues(`variants.${variantIndex}.images`);
        const newImages = currentImages.filter((_, i) => i !== imageIndex);
        setValue(`variants.${variantIndex}.images`, newImages, {
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true
        });
    };

    const [isNavigating, setIsNavigating] = useState(false)

    // ... (existing code)

    const nextStep = async () => {
        if (isNavigating) return;

        let result = false;
        if (step === 1) {
            result = await trigger(['name', 'type', 'gender']);
        } else if (step === 2) {
            result = await trigger(['collection']);
        }

        if (result) {
            setIsNavigating(true);
            setStep(s => Math.min(s + 1, totalSteps));
            // Prevent accidental double clicks hitting the next button
            // Increased delay to prevents bounce clicks from triggering submit
            setTimeout(() => setIsNavigating(false), 800);
        }
    }

    const prevStep = () => {
        setStep(s => Math.max(s - 1, 1));
    }

    const onSubmit = async (data: ProductFormData) => {
        // Prevent submission if no variants are defined
        if (data.variants.length === 0) {
            toast.error("Debes agregar al menos una variante (Color/Talla) para registrar el producto.");
            return;
        }

        setIsSubmitting(true);
        // ... rest of submit logic
        try {
            const productId = initialData?.id || crypto.randomUUID();
            const timestamp = Date.now();

            // Process variants and upload images
            // Notes: We use getValues() to ensure we get the latest state of images, 
            // as they might not be fully synchronized in 'data' if not registered via standard inputs.
            const currentVariants = getValues('variants');

            const processedVariants = await Promise.all(data.variants.map(async (v, index) => {
                const variantId = v.id || crypto.randomUUID();
                const processedImages: string[] = [];

                // Get images from the current form state directly (safer)
                // Use the index from the map to find the corresponding variant in current state
                const variantImages = currentVariants[index]?.images;

                if (variantImages && variantImages.length > 0) {
                    for (const img of variantImages) {
                        if (img instanceof File) {
                            try {
                                // Upload new file
                                const storageRef = ref(storage, `products/${productId}/${variantId}/${Date.now()}-${img.name}`);
                                await uploadBytes(storageRef, img);
                                const url = await getDownloadURL(storageRef);
                                processedImages.push(url);
                            } catch (uploadError) {
                                console.error("Error uploading image:", uploadError);
                                toast.error(`Error al subir imagen para ${v.color}`);
                                // We continue, but this image won't be saved
                            }
                        } else if (typeof img === 'string') {
                            // Keep existing URL
                            processedImages.push(img);
                        }
                    }
                }

                return {
                    id: variantId,
                    sku: generateVariantSKU(
                        generateBaseSKU(data.collection, data.type, data.gender, data.name),
                        v.color,
                        v.size
                    ),
                    color: v.color,
                    colorCode: v.colorCode || '#000000',
                    size: v.size,
                    stock: v.stock,
                    priceProduction: v.priceProduction,
                    priceRetail: v.priceRetail,
                    images: processedImages
                };
            }));

            if (initialData) {
                // Update existing product
                await updateProduct(initialData.id, {
                    name: data.name,
                    collection: data.collection,
                    type: data.type,
                    gender: data.gender,
                    baseCode: generateBaseSKU(data.collection, data.type, data.gender, data.name),
                    variants: processedVariants
                });
            } else {
                // Create new product
                const newProduct = {
                    id: productId,
                    name: data.name,
                    collection: data.collection,
                    type: data.type,
                    gender: data.gender,
                    baseCode: generateBaseSKU(data.collection, data.type, data.gender, data.name),
                    updatedAt: timestamp,
                    createdAt: timestamp,
                    variants: processedVariants
                };
                await addProduct(newProduct);
            }

            if (onComplete) {
                onComplete();
            } else {
                reset();
                setBaseSKU('');
                setStep(1);
            }
        } catch (error) {
            console.error("Error saving product:", error);
            toast.error("Error al guardar el producto");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 min-h-[calc(100vh-10rem)]">

            {/* Header with Stepper */}
            <div className="mb-10">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">{initialData ? 'Editar Producto' : 'Crear Nuevo Producto'}</h2>
                        <p className="text-muted-foreground mt-1">Completa los pasos para registrar un ítem en el inventario.</p>
                    </div>
                    {!initialData && (
                        <div className="hidden md:flex items-center gap-2 text-sm font-medium text-muted-foreground bg-muted/50 px-4 py-2 rounded-full border border-border">
                            <Box className="w-4 h-4" />
                            <span>Wizard Mode</span>
                        </div>
                    )}
                </div>

                <div className="relative">
                    <div className="absolute top-1/2 left-0 w-full h-1 bg-border -z-10 rounded-full"></div>
                    <div className="absolute top-1/2 left-0 h-1 bg-primary -z-10 rounded-full transition-all duration-300" style={{ width: `${((step - 1) / (totalSteps - 1)) * 100}%` }}></div>
                    <div className="flex justify-between">
                        {[
                            { id: 1, label: "Datos Básicos", icon: Tag },
                            { id: 2, label: "Clasificación", icon: Layers },
                            { id: 3, label: "Variantes", icon: Box }
                        ].map((s) => (
                            <div key={s.id} className="flex flex-col items-center gap-2 bg-background px-2">
                                <div className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                                    step >= s.id
                                        ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20"
                                        : "bg-background border-border text-muted-foreground"
                                )}>
                                    {step > s.id ? <Check className="w-6 h-6" /> : <s.icon className="w-5 h-5" />}
                                </div>
                                <span className={cn(
                                    "text-xs font-semibold uppercase tracking-wider transition-colors duration-300",
                                    step >= s.id ? "text-primary" : "text-muted-foreground"
                                )}>{s.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-8"
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                    }
                }}
            >

                {/* Paso 1: Datos Básicos */}
                <div className={cn("space-y-6 animate-in fade-in slide-in-from-right duration-300", step === 1 ? "block" : "hidden")}>
                    <div className="bg-card border border-border rounded-xl p-6 md:p-10 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                            <Tag className="w-64 h-64" />
                        </div>

                        <div className="space-y-8 relative z-10 max-w-3xl">
                            <div className="space-y-3">
                                <label className="text-lg font-semibold flex items-center gap-2">
                                    <span className="bg-primary/10 text-primary w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                                    Nombre del Producto
                                </label>
                                <Input
                                    {...register('name', { required: true })}
                                    placeholder="Ej. Polo Básico Oversize"
                                    className="h-14 text-xl px-5 bg-background shadow-sm border-2 focus-visible:ring-0 focus-visible:border-primary transition-colors"
                                    autoFocus
                                />
                                <p className="text-sm text-muted-foreground ml-1">El nombre comercial que verán tus clientes.</p>
                            </div>

                            <div className="grid md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-lg font-semibold flex items-center gap-2">
                                        <span className="bg-primary/10 text-primary w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                                        Categoría / Tipo
                                    </label>
                                    <Input
                                        {...register('type', { required: true })}
                                        placeholder="Ej. POLO"
                                        className="h-12 font-mono uppercase tracking-wide"
                                    />
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {['POLO', 'PANTALON', 'CASACA', 'SHORTS'].map(t => (
                                            <button
                                                type="button"
                                                key={t}
                                                onClick={() => { setValue('type', t); trigger('type'); }}
                                                className="text-xs bg-accent hover:bg-primary/10 hover:text-primary px-3 py-1.5 rounded-full border border-border transition-colors"
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-lg font-semibold flex items-center gap-2">
                                        <span className="bg-primary/10 text-primary w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span>
                                        Público Objetivo
                                    </label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { value: 'HOMBRE', label: 'Hombre', icon: User },
                                            { value: 'MUJER', label: 'Mujer', icon: User },
                                            { value: 'UNISEX', label: 'Unisex', icon: Users },
                                        ].map((g) => (
                                            <div
                                                key={g.value}
                                                onClick={() => { setValue('gender', g.value as Gender); trigger('gender'); }}
                                                className={cn(
                                                    "cursor-pointer rounded-xl border-2 p-3 flex flex-col items-center gap-2 transition-all duration-200 hover:scale-[1.02]",
                                                    watchedGender === g.value
                                                        ? "border-primary bg-primary/5 text-primary"
                                                        : "border-border bg-background hover:bg-accent hover:border-accent-foreground/20"
                                                )}
                                            >
                                                <g.icon className={cn("w-6 h-6", watchedGender === g.value ? "fill-current" : "")} />
                                                <span className="text-xs font-bold">{g.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <input type="hidden" {...register('gender', { required: true })} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Paso 2: Colección */}
                <div className={cn("space-y-6 animate-in fade-in slide-in-from-right duration-300", step === 2 ? "block" : "hidden")}>
                    <div className="bg-card border border-border rounded-xl p-6 md:p-10 shadow-sm relative overflow-hidden flex flex-col items-center text-center">
                        <div className="absolute top-0 left-0 p-6 opacity-5 pointer-events-none">
                            <Layers className="w-64 h-64" />
                        </div>

                        <div className="max-w-xl w-full relative z-10 space-y-8">
                            <div>
                                <h3 className="text-2xl font-bold">Temporada y Colección</h3>
                                <p className="text-muted-foreground mt-2">Agrupa este producto con otros de la misma línea.</p>
                            </div>

                            <div className="space-y-4">
                                <div className="flex relative items-center">
                                    <Input
                                        {...register('collection', { required: true })}
                                        placeholder="Ej. VERANO 2026"
                                        className="h-16 text-center text-xl font-bold bg-background shadow-sm pr-20 uppercase"
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-16 bg-muted rounded flex items-center justify-center font-mono text-xs font-bold text-muted-foreground border border-border" title="Código de Colección">
                                        {watchedCollection ? watchedCollection.slice(0, 3).toUpperCase() : '---'}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        { label: 'Verano 2026', code: 'VERANO' },
                                        { label: 'Invierno 2024', code: 'INVIERNO' },
                                        { label: 'Básicos', code: 'BASICOS' },
                                        { label: 'Limitados', code: 'LIMITED' },
                                    ].map((c) => (
                                        <button
                                            type="button"
                                            key={c.code}
                                            onClick={() => { setValue('collection', c.code); trigger('collection'); }}
                                            className="p-4 rounded-lg bg-background border border-border hover:border-primary hover:bg-primary/5 transition-all text-left group"
                                        >
                                            <span className="block font-semibold group-hover:text-primary transition-colors">{c.label}</span>
                                            <span className="text-xs text-muted-foreground">Código: {c.code}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-muted/30 p-4 rounded-lg border border-dashed border-border">
                                <span className="text-sm font-medium text-muted-foreground block mb-2 uppercase tracking-widest text-[10px]">Preview SKU Base</span>
                                <div className="text-4xl font-mono font-black text-foreground tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/50">
                                    {baseSKU || '????-???-?-???'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Paso 3: Variantes */}
                <div className={cn("space-y-6 animate-in fade-in slide-in-from-right duration-300", step === 3 ? "block" : "hidden")}>

                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <Box className="text-primary" /> Variantes ({fields.length})
                        </h3>
                        <Button type="button" onClick={() => append({ color: '', size: '', priceProduction: 0, priceRetail: 0, stock: 0, images: [] })} className="shadow-lg shadow-primary/20">
                            <Plus className="mr-2 h-4 w-4" /> Agregar Variante
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {fields.length === 0 ? (
                            <div className="text-center py-20 bg-card rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-4 group cursor-pointer hover:border-primary/50 transition-colors" onClick={() => append({ color: 'Unico', size: 'U', priceProduction: 0, priceRetail: 0, stock: 0, images: [] })}>
                                <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                    <Plus className="w-8 h-8" />
                                </div>
                                <div>
                                    <h4 className="text-lg font-semibold">No hay variantes</h4>
                                    <p className="text-muted-foreground">Haz clic para agregar tu primera variante (Color/Talla)</p>
                                </div>
                            </div>
                        ) : (
                            <div className="grid gap-6">
                                {fields.map((field, index) => (
                                    <div key={field.id} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                        {/* Header de Variante */}
                                        <div className="bg-muted/30 px-6 py-3 border-b border-border flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="bg-background border border-border w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-muted-foreground">#{index + 1}</span>
                                                <span className="font-mono text-xs text-muted-foreground">SKU: {baseSKU ? generateVariantSKU(baseSKU, watch(`variants.${index}.color`), watch(`variants.${index}.size`)) : '...'}</span>
                                            </div>
                                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-muted-foreground hover:text-destructive h-8 w-8">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        <div className="p-6">
                                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                                                {/* Left: Definition */}
                                                {/* Left: Definition */}
                                                <div className="lg:col-span-4 space-y-4 lg:border-r border-border lg:pr-6 flex flex-col justify-between">
                                                    <div>
                                                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">Definición</label>

                                                        {/* Color - Full Width */}
                                                        <div className="flex gap-2 mb-3">
                                                            <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-border shadow-sm shrink-0 cursor-pointer hover:scale-105 transition-transform" title="Elegir Color">
                                                                <input
                                                                    type="color"
                                                                    {...register(`variants.${index}.colorCode`)}
                                                                    className="absolute -top-4 -left-4 w-20 h-20 p-0 cursor-pointer opacity-0"
                                                                />
                                                                <div
                                                                    className="w-full h-full pointer-events-none"
                                                                    style={{ backgroundColor: watch(`variants.${index}.colorCode`) || '#000000' }}
                                                                />
                                                            </div>
                                                            <Input {...register(`variants.${index}.color`)} placeholder="Nombre del Color" className="flex-1 font-semibold bg-accent/20 border-transparent focus:bg-background focus:border-input transition-colors h-10" />
                                                        </div>

                                                        {/* Details Grid: Size & Stock */}
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Talla</label>
                                                                <Input {...register(`variants.${index}.size`)} placeholder="Talla" className="text-center font-mono font-bold uppercase h-10 text-lg" />
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Stock</label>
                                                                <Input type="number" {...register(`variants.${index}.stock`, { valueAsNumber: true })} className="text-center font-bold text-lg h-10" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Middle: Economics */}
                                                <div className="lg:col-span-4 space-y-4 lg:border-r border-border lg:pr-6 lg:pl-2">
                                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">Economía (Unitario)</label>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-1">
                                                            <span className="text-[10px] text-muted-foreground">Costo</span>
                                                            <div className="relative">
                                                                <span className="absolute left-3 top-2.5 text-muted-foreground font-semibold text-sm">S/</span>
                                                                <Input type="number" {...register(`variants.${index}.priceProduction`, { valueAsNumber: true })} className="pl-8" placeholder="0.00" />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <span className="text-[10px] text-primary font-bold">Precio Venta</span>
                                                            <div className="relative">
                                                                <span className="absolute left-3 top-2.5 text-primary font-bold text-sm">S/</span>
                                                                <Input type="number" {...register(`variants.${index}.priceRetail`, { valueAsNumber: true })} className="pl-8 font-bold border-primary/30 bg-primary/5 text-primary" placeholder="0.00" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Right: Images */}
                                                <div className="lg:col-span-4 lg:pl-2">
                                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">Galería</label>

                                                    <div className="grid grid-cols-4 gap-2">
                                                        {(watch(`variants.${index}.images`) || []).map((img, imgIdx) => (
                                                            <div key={imgIdx} className="relative aspect-square rounded-md overflow-hidden border border-border group bg-background">
                                                                <img
                                                                    src={typeof img === 'string' ? img : URL.createObjectURL(img)}
                                                                    alt="Preview"
                                                                    className="w-full h-full object-cover"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeImage(index, imgIdx)}
                                                                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                                                                >
                                                                    <X className="w-5 h-5" />
                                                                </button>
                                                            </div>
                                                        ))}

                                                        <label className="aspect-square rounded-md border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 cursor-pointer flex flex-col items-center justify-center gap-1 transition-colors text-muted-foreground hover:text-primary">
                                                            <ImageIcon className="w-5 h-5" />
                                                            <span className="text-[9px] font-bold uppercase">Subir</span>
                                                            <input
                                                                type="file"
                                                                className="hidden"
                                                                accept="image/*"
                                                                multiple
                                                                onChange={(e) => handleImageChange(e, index)}
                                                            />
                                                        </label>
                                                    </div>
                                                </div>

                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-8 border-t border-border mt-8">
                    <div>
                        {/* Cancel or Back */}
                        {step === 1 ? (
                            <Button type="button" variant="ghost" size="lg" onClick={onComplete}>Cancelar</Button>
                        ) : (
                            <Button type="button" variant="ghost" size="lg" onClick={prevStep} className="gap-2">
                                <ArrowLeft className="w-4 h-4" /> Anterior
                            </Button>
                        )}
                    </div>

                    <div>
                        {step < totalSteps ? (
                            <Button type="button" size="lg" onClick={nextStep} disabled={isNavigating} className="gap-2 px-8 text-lg rounded-full">
                                Siguiente <ArrowRight className="w-5 h-5" />
                            </Button>
                        ) : (
                            !isNavigating && (
                                <Button
                                    type="submit"
                                    size="lg"
                                    className="gap-2 px-10 text-lg rounded-full shadow-xl shadow-primary/25 animate-in fade-in zoom-in duration-300"
                                    disabled={isSubmitting || fields.length === 0}
                                >
                                    {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Guardando...</> : <><Check className="w-5 h-5" /> Finalizar Registro</>}
                                </Button>
                            )
                        )}
                    </div>
                </div>

            </form>
        </div>
    )
}
