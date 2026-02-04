import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Loader2, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

export function ChangePassword() {
    const { changePassword } = useAuth();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password.length < 6) {
            toast.error('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        if (password !== confirmPassword) {
            toast.error('Las contraseñas no coinciden');
            return;
        }

        setIsSubmitting(true);
        try {
            await changePassword(password);
        } catch {
            // Error handled in context
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full p-8 bg-white rounded-xl shadow-xl border border-red-100 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-400 to-red-500" />

                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-orange-100 text-orange-600 mb-4">
                        <KeyRound size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Seguridad Requerida</h1>
                    <p className="text-gray-500 mt-2 px-4">
                        Por motivos de seguridad, debes actualizar tu contraseña antes de continuar.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Nueva Contraseña</label>
                        <input
                            type="password"
                            placeholder="Mínimo 6 caracteres"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all outline-none"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Confirmar Contraseña</label>
                        <input
                            type="password"
                            placeholder="Repite la contraseña"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all outline-none"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3 px-4 bg-gray-900 hover:bg-black text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            'Actualizar Contraseña'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
