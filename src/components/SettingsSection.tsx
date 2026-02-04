import { useState, useEffect } from 'react'
import { Save, User, Moon, Sun } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { useSettingsStore } from '../lib/settingsStore'

export function SettingsSection() {
    const [theme, setTheme] = useState<'light' | 'dark'>('light')
    const [userName, setUserName] = useState('Admin')

    const { globalShippingBase, updateGlobalShipping } = useSettingsStore()
    const [shippingInput, setShippingInput] = useState(globalShippingBase.toString())

    // Update local shipping input when store changes
    useEffect(() => {
        setShippingInput(globalShippingBase.toString());
    }, [globalShippingBase]);

    // Effect to toggle class
    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);

    const handleSaveGlobal = () => {
        const val = parseFloat(shippingInput);
        if (!isNaN(val) && val !== globalShippingBase) {
            updateGlobalShipping(val);
        }
        localStorage.setItem('scs_settings_user', userName);
        alert('Preferencias guardadas');
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

                {/* Logistics has been moved to its own section */}
                <div className="bg-accent/10 border border-accent rounded-xl p-6 text-center">
                    <p className="text-muted-foreground">
                        ¿Buscas la configuración de envíos? Ahora tiene su propia sección en <strong>Logística</strong>.
                    </p>
                </div>
            </div>
        </div>
    )
}
