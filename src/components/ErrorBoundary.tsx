import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 max-w-2xl mx-auto mt-10 bg-red-50 text-red-900 rounded-lg border border-red-200">
                    <h1 className="text-2xl font-bold mb-4">¡Ups! Algo salió mal.</h1>
                    <p className="mb-4">Se ha producido un error inesperado al renderizar la aplicación.</p>
                    <pre className="bg-white p-4 rounded border border-red-100 overflow-auto text-sm font-mono">
                        {this.state.error?.toString()}
                    </pre>
                </div>
            );
        }

        return this.props.children;
    }
}
