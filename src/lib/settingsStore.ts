import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface DistrictConfig {
    name: string;
    department: 'LIMA' | 'CALLAO';
    basePrice: number;
    allowDoorDelivery: boolean;
}

interface SettingsState {
    globalShippingBase: number; // Fallback or base
    districts: DistrictConfig[];

    // Actions
    updateGlobalShipping: (price: number) => void;
    updateDistrict: (name: string, config: Partial<DistrictConfig>) => void;
    toggleDoorDelivery: (name: string) => void;
}

// Full List Initialization
const INITIAL_DISTRICTS: DistrictConfig[] = [
    // Lima
    { name: 'Lima Cercado', department: 'LIMA', basePrice: 8, allowDoorDelivery: true },
    { name: 'Ancón', department: 'LIMA', basePrice: 15, allowDoorDelivery: false },
    { name: 'Ate', department: 'LIMA', basePrice: 10, allowDoorDelivery: true },
    { name: 'Barranco', department: 'LIMA', basePrice: 8, allowDoorDelivery: true },
    { name: 'Breña', department: 'LIMA', basePrice: 8, allowDoorDelivery: true },
    { name: 'Carabayllo', department: 'LIMA', basePrice: 12, allowDoorDelivery: false },
    { name: 'Chaclacayo', department: 'LIMA', basePrice: 15, allowDoorDelivery: true },
    { name: 'Chorrillos', department: 'LIMA', basePrice: 10, allowDoorDelivery: true },
    { name: 'Cieneguilla', department: 'LIMA', basePrice: 15, allowDoorDelivery: true },
    { name: 'Comas', department: 'LIMA', basePrice: 10, allowDoorDelivery: false },
    { name: 'El Agustino', department: 'LIMA', basePrice: 8, allowDoorDelivery: false },
    { name: 'Independencia', department: 'LIMA', basePrice: 10, allowDoorDelivery: false },
    { name: 'Jesús María', department: 'LIMA', basePrice: 7, allowDoorDelivery: true },
    { name: 'La Molina', department: 'LIMA', basePrice: 10, allowDoorDelivery: true },
    { name: 'La Victoria', department: 'LIMA', basePrice: 8, allowDoorDelivery: false },
    { name: 'Lince', department: 'LIMA', basePrice: 7, allowDoorDelivery: true },
    { name: 'Los Olivos', department: 'LIMA', basePrice: 10, allowDoorDelivery: true },
    { name: 'Lurigancho', department: 'LIMA', basePrice: 15, allowDoorDelivery: false },
    { name: 'Lurín', department: 'LIMA', basePrice: 15, allowDoorDelivery: true },
    { name: 'Magdalena del Mar', department: 'LIMA', basePrice: 7, allowDoorDelivery: true },
    { name: 'Miraflores', department: 'LIMA', basePrice: 7, allowDoorDelivery: true },
    { name: 'Pachacámac', department: 'LIMA', basePrice: 15, allowDoorDelivery: true },
    { name: 'Pucusana', department: 'LIMA', basePrice: 20, allowDoorDelivery: false },
    { name: 'Pueblo Libre', department: 'LIMA', basePrice: 7, allowDoorDelivery: true },
    { name: 'Puente Piedra', department: 'LIMA', basePrice: 12, allowDoorDelivery: false },
    { name: 'Punta Hermosa', department: 'LIMA', basePrice: 20, allowDoorDelivery: true },
    { name: 'Punta Negra', department: 'LIMA', basePrice: 20, allowDoorDelivery: true },
    { name: 'Rímac', department: 'LIMA', basePrice: 8, allowDoorDelivery: false },
    { name: 'San Bartolo', department: 'LIMA', basePrice: 20, allowDoorDelivery: true },
    { name: 'San Borja', department: 'LIMA', basePrice: 8, allowDoorDelivery: true },
    { name: 'San Isidro', department: 'LIMA', basePrice: 7, allowDoorDelivery: true },
    { name: 'San Juan de Lurigancho', department: 'LIMA', basePrice: 12, allowDoorDelivery: false },
    { name: 'San Juan de Miraflores', department: 'LIMA', basePrice: 10, allowDoorDelivery: false },
    { name: 'San Luis', department: 'LIMA', basePrice: 8, allowDoorDelivery: true },
    { name: 'San Martín de Porres', department: 'LIMA', basePrice: 10, allowDoorDelivery: false },
    { name: 'San Miguel', department: 'LIMA', basePrice: 7, allowDoorDelivery: true },
    { name: 'Santa Anita', department: 'LIMA', basePrice: 10, allowDoorDelivery: true },
    { name: 'Santa María del Mar', department: 'LIMA', basePrice: 20, allowDoorDelivery: true },
    { name: 'Santa Rosa', department: 'LIMA', basePrice: 15, allowDoorDelivery: false },
    { name: 'Santiago de Surco', department: 'LIMA', basePrice: 8, allowDoorDelivery: true },
    { name: 'Surquillo', department: 'LIMA', basePrice: 8, allowDoorDelivery: true },
    { name: 'Villa El Salvador', department: 'LIMA', basePrice: 12, allowDoorDelivery: false },
    { name: 'Villa María del Triunfo', department: 'LIMA', basePrice: 12, allowDoorDelivery: false },

    // Callao
    { name: 'Callao', department: 'CALLAO', basePrice: 10, allowDoorDelivery: false },
    { name: 'Bellavista', department: 'CALLAO', basePrice: 9, allowDoorDelivery: true },
    { name: 'Carmen de la Legua', department: 'CALLAO', basePrice: 9, allowDoorDelivery: false },
    { name: 'La Perla', department: 'CALLAO', basePrice: 9, allowDoorDelivery: true },
    { name: 'La Punta', department: 'CALLAO', basePrice: 10, allowDoorDelivery: true },
    { name: 'Ventanilla', department: 'CALLAO', basePrice: 12, allowDoorDelivery: false },
    { name: 'Mi Perú', department: 'CALLAO', basePrice: 12, allowDoorDelivery: false },
];

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            globalShippingBase: 5,
            districts: INITIAL_DISTRICTS.sort((a, b) => a.name.localeCompare(b.name)),

            updateGlobalShipping: (price) => set({ globalShippingBase: price }),

            updateDistrict: (name, config) => set((state) => ({
                districts: state.districts.map(d => d.name === name ? { ...d, ...config } : d)
            })),

            toggleDoorDelivery: (name) => set((state) => ({
                districts: state.districts.map(d => d.name === name ? { ...d, allowDoorDelivery: !d.allowDoorDelivery } : d)
            }))
        }),
        {
            name: 'scs-settings-storage',
        }
    )
);
