import { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';
import { Button } from './ui/button';

export function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        const handler = (e: any) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e);
            // Update UI notify the user they can install the PWA
            setShowPrompt(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        // Show the install prompt
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);

        // We've used the prompt, and can't use it again, throw it away
        setDeferredPrompt(null);
        setShowPrompt(false);
    };

    const handleClose = () => {
        setShowPrompt(false);
    };

    if (!showPrompt) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-card text-card-foreground border border-border rounded-xl shadow-lg max-w-sm w-full p-6 relative animate-in zoom-in-95 duration-300">
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="flex flex-col items-center text-center gap-4">
                    <div className="h-12 w-12 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                        <Download size={24} />
                    </div>

                    <div className="space-y-2">
                        <h3 className="font-bold text-lg">Instalar Aplicación</h3>
                        <p className="text-muted-foreground text-sm">
                            Instala SCS en tu dispositivo para un acceso más rápido, uso sin conexión y una mejor experiencia.
                        </p>
                    </div>

                    <div className="flex gap-3 w-full mt-2">
                        <Button variant="outline" className="flex-1" onClick={handleClose}>
                            Ahora no
                        </Button>
                        <Button className="flex-1" onClick={handleInstallClick}>
                            Instalar
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
