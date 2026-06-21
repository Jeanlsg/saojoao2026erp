import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Erro capturado:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <div className="max-w-md w-full bg-card rounded-lg p-6 space-y-4 text-center">
            <h1 className="text-2xl font-bold text-destructive">Algo deu errado</h1>
            <p className="text-sm text-muted-foreground">
              {this.state.error?.message || "Erro desconhecido"}
            </p>
            <details className="text-left">
              <summary className="text-xs text-muted-foreground cursor-pointer">
                Detalhes técnicos
              </summary>
              <pre className="text-[10px] bg-muted p-2 rounded mt-2 overflow-auto max-h-40">
                {this.state.error?.stack}
              </pre>
            </details>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
            >
              Recarregar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
