import { create } from 'zustand';
import { db } from './firebase';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';

export interface DistrictConfig {
    name: string;
    department: 'LIMA' | 'CALLAO';
    zone: string; // 'Lima Norte', 'Lima Sur', 'Lima Este', 'Lima Centro', 'Callao'
    doorPrice: number;
    meetupPrice: number;
    allowDoorDelivery: boolean;
}

interface SettingsState {
    globalShippingBase: number; // Fallback or base
    districts: DistrictConfig[];
    loading: boolean;
    initialized: boolean;

    // Actions
    initializeSubscription: () => () => void;
    updateGlobalShipping: (price: number) => Promise<void>;
    updateDistrict: (name: string, config: Partial<DistrictConfig>) => Promise<void>;
    toggleDoorDelivery: (name: string) => Promise<void>;
    cleanup: () => void;
}

// Full List Initialization (Fallback / Seed)
// RE-ZONED: Lima Top districts redistributed to Centro, Sur, Este per user request.
const INITIAL_DISTRICTS: DistrictConfig[] = [
    // LIMA CENTRO (Expanded)
    { name: 'Lima Cercado', department: 'LIMA', zone: 'Lima Centro', doorPrice: 10, meetupPrice: 5, allowDoorDelivery: true },
    { name: 'Breña', department: 'LIMA', zone: 'Lima Centro', doorPrice: 10, meetupPrice: 5, allowDoorDelivery: true },
    { name: 'Jesús María', department: 'LIMA', zone: 'Lima Centro', doorPrice: 10, meetupPrice: 5, allowDoorDelivery: true },
    { name: 'La Victoria', department: 'LIMA', zone: 'Lima Centro', doorPrice: 10, meetupPrice: 5, allowDoorDelivery: false },
    { name: 'Lince', department: 'LIMA', zone: 'Lima Centro', doorPrice: 10, meetupPrice: 5, allowDoorDelivery: true },
    { name: 'Rímac', department: 'LIMA', zone: 'Lima Centro', doorPrice: 10, meetupPrice: 5, allowDoorDelivery: false },
    { name: 'San Luis', department: 'LIMA', zone: 'Lima Centro', doorPrice: 10, meetupPrice: 5, allowDoorDelivery: true },
    // Ex-Modern/Top -> Centro
    { name: 'Magdalena del Mar', department: 'LIMA', zone: 'Lima Centro', doorPrice: 12, meetupPrice: 5, allowDoorDelivery: true },
    { name: 'Miraflores', department: 'LIMA', zone: 'Lima Centro', doorPrice: 12, meetupPrice: 5, allowDoorDelivery: true },
    { name: 'Pueblo Libre', department: 'LIMA', zone: 'Lima Centro', doorPrice: 10, meetupPrice: 5, allowDoorDelivery: true },
    { name: 'San Borja', department: 'LIMA', zone: 'Lima Centro', doorPrice: 12, meetupPrice: 5, allowDoorDelivery: true },
    { name: 'San Isidro', department: 'LIMA', zone: 'Lima Centro', doorPrice: 12, meetupPrice: 5, allowDoorDelivery: true },
    { name: 'San Miguel', department: 'LIMA', zone: 'Lima Centro', doorPrice: 10, meetupPrice: 5, allowDoorDelivery: true },
    { name: 'Surquillo', department: 'LIMA', zone: 'Lima Centro', doorPrice: 10, meetupPrice: 5, allowDoorDelivery: true },

    // LIMA NORTE
    { name: 'Ancón', department: 'LIMA', zone: 'Lima Norte', doorPrice: 20, meetupPrice: 10, allowDoorDelivery: false },
    { name: 'Carabayllo', department: 'LIMA', zone: 'Lima Norte', doorPrice: 15, meetupPrice: 8, allowDoorDelivery: false },
    { name: 'Comas', department: 'LIMA', zone: 'Lima Norte', doorPrice: 15, meetupPrice: 8, allowDoorDelivery: false },
    { name: 'Independencia', department: 'LIMA', zone: 'Lima Norte', doorPrice: 12, meetupPrice: 5, allowDoorDelivery: false },
    { name: 'Los Olivos', department: 'LIMA', zone: 'Lima Norte', doorPrice: 12, meetupPrice: 5, allowDoorDelivery: true },
    { name: 'Puente Piedra', department: 'LIMA', zone: 'Lima Norte', doorPrice: 15, meetupPrice: 8, allowDoorDelivery: false },
    { name: 'San Martín de Porres', department: 'LIMA', zone: 'Lima Norte', doorPrice: 12, meetupPrice: 5, allowDoorDelivery: false },
    { name: 'Santa Rosa', department: 'LIMA', zone: 'Lima Norte', doorPrice: 20, meetupPrice: 10, allowDoorDelivery: false },

    // LIMA SUR
    { name: 'Chorrillos', department: 'LIMA', zone: 'Lima Sur', doorPrice: 12, meetupPrice: 5, allowDoorDelivery: true },
    { name: 'Lurín', department: 'LIMA', zone: 'Lima Sur', doorPrice: 20, meetupPrice: 10, allowDoorDelivery: true },
    { name: 'Pachacámac', department: 'LIMA', zone: 'Lima Sur', doorPrice: 25, meetupPrice: 10, allowDoorDelivery: true },
    { name: 'Pucusana', department: 'LIMA', zone: 'Lima Sur', doorPrice: 30, meetupPrice: 15, allowDoorDelivery: false },
    { name: 'Punta Hermosa', department: 'LIMA', zone: 'Lima Sur', doorPrice: 25, meetupPrice: 12, allowDoorDelivery: true },
    { name: 'Punta Negra', department: 'LIMA', zone: 'Lima Sur', doorPrice: 25, meetupPrice: 12, allowDoorDelivery: true },
    { name: 'San Bartolo', department: 'LIMA', zone: 'Lima Sur', doorPrice: 25, meetupPrice: 12, allowDoorDelivery: true },
    { name: 'San Juan de Miraflores', department: 'LIMA', zone: 'Lima Sur', doorPrice: 12, meetupPrice: 5, allowDoorDelivery: false },
    { name: 'Santa María del Mar', department: 'LIMA', zone: 'Lima Sur', doorPrice: 25, meetupPrice: 12, allowDoorDelivery: true },
    { name: 'Villa El Salvador', department: 'LIMA', zone: 'Lima Sur', doorPrice: 15, meetupPrice: 8, allowDoorDelivery: false },
    { name: 'Villa María del Triunfo', department: 'LIMA', zone: 'Lima Sur', doorPrice: 15, meetupPrice: 8, allowDoorDelivery: false },
    // Ex-Modern/Top -> Sur
    { name: 'Barranco', department: 'LIMA', zone: 'Lima Sur', doorPrice: 12, meetupPrice: 5, allowDoorDelivery: true },
    { name: 'Santiago de Surco', department: 'LIMA', zone: 'Lima Sur', doorPrice: 12, meetupPrice: 5, allowDoorDelivery: true },

    // LIMA ESTE
    { name: 'Ate', department: 'LIMA', zone: 'Lima Este', doorPrice: 15, meetupPrice: 8, allowDoorDelivery: true },
    { name: 'Chaclacayo', department: 'LIMA', zone: 'Lima Este', doorPrice: 20, meetupPrice: 10, allowDoorDelivery: true },
    { name: 'Cieneguilla', department: 'LIMA', zone: 'Lima Este', doorPrice: 25, meetupPrice: 12, allowDoorDelivery: true },
    { name: 'El Agustino', department: 'LIMA', zone: 'Lima Este', doorPrice: 10, meetupPrice: 5, allowDoorDelivery: false },
    { name: 'Lurigancho', department: 'LIMA', zone: 'Lima Este', doorPrice: 20, meetupPrice: 10, allowDoorDelivery: false },
    { name: 'San Juan de Lurigancho', department: 'LIMA', zone: 'Lima Este', doorPrice: 12, meetupPrice: 5, allowDoorDelivery: false },
    { name: 'Santa Anita', department: 'LIMA', zone: 'Lima Este', doorPrice: 12, meetupPrice: 5, allowDoorDelivery: true },
    // Ex-Modern/Top -> Este
    { name: 'La Molina', department: 'LIMA', zone: 'Lima Este', doorPrice: 12, meetupPrice: 5, allowDoorDelivery: true },

    // CALLAO
    { name: 'Callao', department: 'CALLAO', zone: 'Callao', doorPrice: 15, meetupPrice: 8, allowDoorDelivery: false },
    { name: 'Bellavista', department: 'CALLAO', zone: 'Callao', doorPrice: 12, meetupPrice: 5, allowDoorDelivery: true },
    { name: 'Carmen de la Legua', department: 'CALLAO', zone: 'Callao', doorPrice: 12, meetupPrice: 5, allowDoorDelivery: false },
    { name: 'La Perla', department: 'CALLAO', zone: 'Callao', doorPrice: 12, meetupPrice: 5, allowDoorDelivery: true },
    { name: 'La Punta', department: 'CALLAO', zone: 'Callao', doorPrice: 15, meetupPrice: 8, allowDoorDelivery: true },
    { name: 'Ventanilla', department: 'CALLAO', zone: 'Callao', doorPrice: 15, meetupPrice: 8, allowDoorDelivery: false },
    { name: 'Mi Perú', department: 'CALLAO', zone: 'Callao', doorPrice: 15, meetupPrice: 8, allowDoorDelivery: false },
] as DistrictConfig[];

// Sort them
INITIAL_DISTRICTS.sort((a, b) => a.name.localeCompare(b.name));

export const useSettingsStore = create<SettingsState>((set, get) => ({
    globalShippingBase: 5,
    districts: INITIAL_DISTRICTS,
    loading: true,
    initialized: false,

    initializeSubscription: () => {
        // We allow re-subscription to handle React Strict Mode / Re-auth flows correctly.


        const docRef = doc(db, 'settings', 'global');
        const unsub = onSnapshot(docRef, async (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const loadedDistricts = data.districts as DistrictConfig[];

                // MASTER MERGE STRATEGY
                // We use INITIAL_DISTRICTS as the "Source of Truth" for which districts should exist.
                // We merge existing prices/settings from the DB (loadedDistricts) into this master list.
                const mergedDistricts = INITIAL_DISTRICTS.map(staticDist => {
                    const savedDist = loadedDistricts.find(d => d.name === staticDist.name);

                    if (savedDist) {
                        // Restore saved values, but enforce static Zone if we want to correct layout
                        // This fixes "Lima Top" issues by ignoring savedDist.zone and using staticDist.zone
                        return {
                            ...staticDist, // Start with static (correct Zone)
                            doorPrice: savedDist.doorPrice ?? (savedDist as any).basePrice ?? staticDist.doorPrice,
                            meetupPrice: savedDist.meetupPrice ?? staticDist.meetupPrice,
                            allowDoorDelivery: savedDist.allowDoorDelivery ?? staticDist.allowDoorDelivery
                        };
                    } else {
                        // New district in code that wasn't in DB
                        return staticDist;
                    }
                });

                // Check if we need to update the DB (if counts differ or old zones persist in DB)
                // We check if DB 'loadedDistricts' has 'Lima Top' or 'Lima Moderna' or missing items
                const needsUpdate = loadedDistricts.length !== INITIAL_DISTRICTS.length ||
                    loadedDistricts.some(d => d.zone === 'Lima Top' || d.zone === 'Lima Moderna');

                set({
                    globalShippingBase: data.globalShippingBase,
                    districts: mergedDistricts, // Use the clean merged list
                    loading: false,
                    initialized: true
                });

                if (needsUpdate) {
                    console.log("Syncing district list with master to fix zones/counts...");
                    try {
                        updateDoc(docRef, { districts: mergedDistricts });
                        console.log("DB Synced successfully");
                    } catch (e) {
                        console.error("Failed to auto-sync districts", e);
                    }
                }
            } else {
                // If doesn't exist, create it with defaults!
                // This "auto-seeds" the cloud settings.
                try {
                    await setDoc(docRef, {
                        globalShippingBase: 5,
                        districts: INITIAL_DISTRICTS
                    });
                    // Snapshot will trigger again automatically
                } catch (e) {
                    console.error("Error creating initial settings:", e);
                    toast.error("Error inicializando configuración en la nube");
                }
            }
        }, (error) => {
            console.error(error);
            toast.error("No se pudo cargar la configuración");
        });

        set({ initialized: true });
        return unsub;
    },

    updateGlobalShipping: async (price) => {
        try {
            await updateDoc(doc(db, 'settings', 'global'), {
                globalShippingBase: price
            });
            toast.success('Tarifa base actualizada');
        } catch (e) {
            console.error(e);
            toast.error('Error al guardar');
        }
    },

    updateDistrict: async (name, config) => {
        const currentDistricts = get().districts;
        const newDistricts = currentDistricts.map(d => d.name === name ? { ...d, ...config } : d);

        // Optimistic Update
        set({ districts: newDistricts });

        try {
            await updateDoc(doc(db, 'settings', 'global'), {
                districts: newDistricts
            });
            // toast.success('Distrito actualizado'); // Silent success for smoother feel
        } catch (e) {
            console.error(e);
            toast.error('Error al actualizar distrito');
            // Revert on error could be added here if needed, but snapshot usually fixes it or we reload
        }
    },

    toggleDoorDelivery: async (name) => {
        const currentDistricts = get().districts;
        const newDistricts = currentDistricts.map(d => d.name === name ? { ...d, allowDoorDelivery: !d.allowDoorDelivery } : d);

        // Optimistic Update
        set({ districts: newDistricts });

        try {
            await updateDoc(doc(db, 'settings', 'global'), {
                districts: newDistricts
            });
        } catch (e) {
            console.error(e);
            toast.error('Error al actualizar');
            set({ districts: currentDistricts }); // Revert
        }
    },

    cleanup: () => {
        set({ initialized: false, loading: true });
    }
}));
