import React, { createContext, useContext, useEffect, useState } from 'react';
import type {
    User,
    AuthError
} from 'firebase/auth';
import {
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    updatePassword
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { toast } from 'sonner';

interface AuthContextType {
    user: User | null;
    userData: { name: string; requiresPasswordChange: boolean } | null;
    loading: boolean;
    login: (username: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    changePassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [userData, setUserData] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                try {
                    // Fetch extra user data like 'requiresPasswordChange'
                    const docRef = doc(db, 'users', currentUser.uid);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        setUserData(docSnap.data());
                    } else {
                        // Auto-create profile for users manually created in Firebase Console
                        const newProfile = {
                            name: currentUser.email?.split('@')[0] || 'Usuario',
                            email: currentUser.email,
                            role: 'admin',
                            requiresPasswordChange: true, // Ensure we force password change
                            createdAt: Date.now()
                        };
                        try {
                            await setDoc(docRef, newProfile);
                            setUserData(newProfile);
                        } catch (e) {
                            console.error("Error creating user profile:", e);
                            setUserData({}); // Fail graceful
                        }
                    }
                } catch (error) {
                    console.error("Error fetching user profile (Permissions?):", error);
                    // If we can't read profile, we can't enforce password change, but we should let them in to see the error.
                    // Or set a default state.
                    setUserData(null);
                    toast.error("Error de permisos en Base de Datos. Revisa las reglas de Firestore.");
                }
            } else {
                setUserData(null);
            }
            setUser(currentUser);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = async (username: string, password: string) => {
        // Transform "sebastian" -> "sebastian@artemya.com"
        const email = username.includes('@')
            ? username
            : `${username.toLowerCase()}@artemya.com`;

        try {
            await signInWithEmailAndPassword(auth, email, password);
            toast.success('Sesión iniciada correctamente');
        } catch (error) {
            console.error(error);
            const authError = error as AuthError;
            if (authError.code === 'auth/invalid-credential' || authError.code === 'auth/user-not-found' || authError.code === 'auth/wrong-password') {
                toast.error('Usuario o contraseña incorrectos');
            } else {
                toast.error(`Error al iniciar sesión: ${authError.message} `);
            }
            throw error;
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
            toast.success('Sesión cerrada');
        } catch (error) {
            toast.error('Error al cerrar sesión');
        }
    };

    const changePassword = async (newPassword: string) => {
        if (!user) throw new Error('No hay usuario autenticado');

        try {
            await updatePassword(user, newPassword);

            // Update flag in Firestore
            await setDoc(doc(db, 'users', user.uid), {
                requiresPasswordChange: false
            }, { merge: true });

            // Refresh local state
            setUserData((prev: any) => ({ ...prev, requiresPasswordChange: false }));

            toast.success('Contraseña actualizada correctamente');
        } catch (error) {
            console.error(error);
            toast.error('Error al actualizar la contraseña');
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{ user, userData, loading, login, logout, changePassword }}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
