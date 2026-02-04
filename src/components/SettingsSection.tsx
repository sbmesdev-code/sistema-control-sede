import { useState, useEffect } from 'react'
import { Save, User, Moon, Sun, Truck, Check, X } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { useSettingsStore } from '../lib/settingsStore'

export function SettingsSection() {
    const [theme, setTheme] = useState<'light' | 'dark'>('light')
    const [userName, setUserName] = useState('Admin')

    const { globalShippingBase, updateGlobalShipping, districts, updateDistrict, toggleDoorDelivery } = useSettingsStore()
    const [shippingInput, setShippingInput] = useState(globalShippingBase.toString())

    // Effect to toggle class
    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);

    const handleSaveGlobal = () => {
        updateGlobalShipping(parseFloat(shippingInput) || 5);
        localStorage.setItem('scs_settings_user', userName);
        alert('Configuración guardada');
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-10">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Configuración</h2>
                    <p className="text-muted-foreground mt-1">Preferencias del sistema y logística.</p>
                </div>
                <Button onClick={handleSaveGlobal}>
                    <Save className="mr-2 h-4 w-4" /> Guardar Preferencias
                </Button>
            </div>

            <div className="grid gap-6">
                {/* User & Appearance Block (Grid of 2) */}
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                            <User className="h-5 w-5 text-primary" /> Perfil de Usuario
                        </h3>
                        <div className="grid gap-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Nombre de Usuario</label>
                                <Input value={userName} onChange={e => setUserName(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                            <Moon className="h-5 w-5 text-primary" /> Apariencia
                        </h3>
                        <div className="flex gap-4">
                            <div
                                onClick={() => setTheme('light')}
                                className={`cursor-pointer rounded-lg border-2 p-4 flex flex-col items-center gap-2 flex-1 ${theme === 'light' ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'}`}
                            >
                                <Sun className="h-6 w-6" />
                                <span className="text-sm font-medium">Claro</span>
                            </div>
                            <div
                                onClick={() => setTheme('dark')}
                                className={`cursor-pointer rounded-lg border-2 p-4 flex flex-col items-center gap-2 flex-1 ${theme === 'dark' ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'}`}
                            >
                                <Moon className="h-6 w-6" />
                                <span className="text-sm font-medium">Oscuro</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Logistics Configuration */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Truck className="h-5 w-5 text-primary" /> Cobertura y Envíos
                        </h3>
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-muted-foreground">Costo Base Global:</label>
                            <div className="relative w-24">
                                <span className="absolute left-2 top-1.5 text-xs text-muted-foreground text-bold">S/</span>
                                <Input
                                    className="h-8 pl-6"
                                    value={shippingInput}
                                    onChange={e => setShippingInput(e.target.value)}
                                    type="number"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-md border border-border overflow-hidden">
                        <div className="max-h-[400px] overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-muted sticky top-0 z-10">
                                    <tr className="text-left text-xs uppercase text-muted-foreground font-semibold">
                                        <th className="p-3">Distrito</th>
                                        <th className="p-3">Departamento</th>
                                        <th className="p-3 w-32">Precio Min. (S/)</th>
                                        <th className="p-3 text-center">Entrega a Puerta</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border bg-card">
                                    {districts.map((dist) => (
                                        <tr key={dist.name} className="hover:bg-muted/50">
                                            <td className="p-3 font-medium">{dist.name}</td>
                                            <td className="p-3 text-muted-foreground text-xs">{dist.department}</td>
                                            <td className="p-3">
                                                <Input
                                                    className="h-7 w-20 text-right"
                                                    type="number"
                                                    value={dist.basePrice}
                                                    onChange={(e) => updateDistrict(dist.name, { basePrice: parseFloat(e.target.value) || 0 })}
                                                />
                                            </td>
                                            <td className="p-3 text-center">
                                                <button
                                                    onClick={() => toggleDoorDelivery(dist.name)}
                                                    className={`inline-flex items-center justify-center p-1.5 rounded-full transition-colors ${dist.allowDoorDelivery ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                                                    title={dist.allowDoorDelivery ? "Entrega a puerta habilitada" : "Solo Punto de Encuentro"}
                                                >
                                                    {dist.allowDoorDelivery ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-4">
                        * Los distritos marcados con <X className="inline h-3 w-3 text-red-500" /> solo permiten entrega en "Punto de Encuentro".
                    </p>
                </div>
            </div>
        </div>
    )
}
