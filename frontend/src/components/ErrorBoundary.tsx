import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
    error: Error | null;
}

// Render sırasında atılan bir hata uygulamayı beyaz ekrana düşürmesin; kullanıcıya yenileme seçeneği sunar.
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
    state: State = { error: null };

    static getDerivedStateFromError(error: Error): State {
        return { error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('Beklenmeyen hata:', error, info.componentStack);
    }

    render() {
        if (!this.state.error) return this.props.children;
        return (
            <div role="alert" className="flex min-h-screen items-center justify-center bg-background px-4">
                <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center">
                    <h1 className="font-serif text-2xl font-bold text-foreground">Bir şeyler ters gitti</h1>
                    <p className="mt-2 text-sm text-rb-text-sub">Sayfa beklenmedik bir hatayla karşılaştı. Sayfayı yenileyerek devam edebilirsiniz.</p>
                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="mt-5 h-11 w-full rounded-xl bg-rb-gold text-sm font-semibold text-rb-gold-foreground transition-colors hover:bg-rb-gold/85"
                    >
                        Sayfayı yenile
                    </button>
                </div>
            </div>
        );
    }
}
