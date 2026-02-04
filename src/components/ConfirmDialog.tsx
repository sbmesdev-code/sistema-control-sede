import { Button } from './ui/button';
import { AlertTriangle, CheckCircle, X } from 'lucide-react';

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'info' | 'success';
}

export function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Aceptar",
    cancelText = "Cancelar",
    variant = 'info'
}: ConfirmDialogProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-card w-full max-w-md rounded-xl shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 relative">
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>

                    <div className="flex flex-col items-center text-center gap-4">
                        <div className={`p-3 rounded-full ${variant === 'danger' ? 'bg-red-100 text-red-600' : 'bg-primary/10 text-primary'}`}>
                            {variant === 'danger' ? <AlertTriangle className="h-8 w-8" /> : <CheckCircle className="h-8 w-8" />}
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-xl font-bold">{title}</h3>
                            <p className="text-muted-foreground text-sm">{message}</p>
                        </div>

                        <div className="flex gap-3 w-full mt-2">
                            <Button variant="outline" className="flex-1" onClick={onClose}>
                                {cancelText}
                            </Button>
                            <Button
                                variant={variant === 'danger' ? 'destructive' : 'default'}
                                className="flex-1"
                                onClick={() => {
                                    onConfirm();
                                    onClose();
                                }}
                            >
                                {confirmText}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
