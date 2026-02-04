import { useState } from 'react'
import { InventoryList } from './inventory/InventoryList'
import { ProductForm } from './inventory/ProductForm'
import { Button } from './ui/button'
import { ArrowLeft } from 'lucide-react'
import type { Product } from '../types/inventory'

export function InventorySection() {
    const [mode, setMode] = useState<'LIST' | 'CREATE' | 'EDIT'>('LIST')
    const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined)

    const handleEdit = (product: Product) => {
        setEditingProduct(product)
        setMode('EDIT')
    }

    const handleCancel = () => {
        setEditingProduct(undefined)
        setMode('LIST')
    }

    return (
        <div className="h-full flex flex-col">
            {(mode === 'CREATE' || mode === 'EDIT') && (
                <div className="mb-4">
                    <Button variant="ghost" onClick={handleCancel} className="gap-2">
                        <ArrowLeft className="h-4 w-4" /> Volver al Listado
                    </Button>
                </div>
            )}

            {mode === 'LIST' ? (
                <InventoryList
                    onAddProduct={() => { setEditingProduct(undefined); setMode('CREATE'); }}
                    onEditProduct={handleEdit}
                />
            ) : (
                <ProductForm initialData={editingProduct} onComplete={handleCancel} />
            )}
        </div>
    )
}
