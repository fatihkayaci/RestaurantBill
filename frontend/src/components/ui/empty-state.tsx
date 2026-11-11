import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Info, Plus, Search, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateAction {
    label: string;
    onClick: () => void;
}

interface EmptyStateLink {
    label: string;
    to: string;
}

interface QuickAdds {
    /** Tek tıkla oluşturulacak hazır isimler (Ana Yemek, Salon gibi). */
    options: string[];
    onPick: (name: string) => Promise<void> | void;
}

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description?: string;
    /** Altın ana buton; verilmezse buton çizilmez (ör. Denetim Kaydı). */
    action?: EmptyStateAction;
    /** Ana butonun yanında ikincil bağlantı (ör. "Kurulum adımlarına dön"). */
    link?: EmptyStateLink;
    /** En altta küçük bilgi satırı. */
    hint?: string;
    quickAdds?: QuickAdds;
    /** Tablo hücresi gibi zaten çerçeveli bir yerde: kesikli kenarlık ve arka plan çizilmez. */
    bare?: boolean;
    className?: string;
}

// Boş liste yerine ne yapılacağını söyleyen kart. Tasarım: canvas "Boş Durum Tasarımları".
export function EmptyState({ icon: Icon, title, description, action, link, hint, quickAdds, bare, className }: EmptyStateProps) {
    const [busy, setBusy] = useState<string | null>(null);

    const pick = async (name: string) => {
        if (!quickAdds || busy) return;
        setBusy(name);
        try {
            await quickAdds.onPick(name);
        } finally {
            setBusy(null);
        }
    };

    return (
        <section
            className={cn(
                'flex flex-col items-center justify-center text-center px-6',
                bare ? 'py-10' : 'py-12 rounded-2xl border-[1.5px] border-dashed border-rb-gold/40 bg-card',
                className
            )}
        >
            <div className="relative flex h-[72px] w-[72px] items-center justify-center rounded-full bg-rb-gold-bg">
                <Icon className="h-[30px] w-[30px] text-rb-amber" strokeWidth={1.8} aria-hidden="true" />
                {action && (
                    <span className="absolute -right-0.5 -bottom-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-rb-gold border-[3px] border-card">
                        <Plus className="h-3 w-3 text-rb-gold-foreground" strokeWidth={3} aria-hidden="true" />
                    </span>
                )}
            </div>

            <h2 className="mt-5 font-serif text-2xl font-bold leading-tight text-foreground">{title}</h2>
            {description && (
                <p className="mt-2 max-w-[420px] text-sm leading-relaxed text-muted-foreground">{description}</p>
            )}

            {quickAdds && quickAdds.options.length > 0 && (
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {quickAdds.options.map(name => (
                        <button
                            key={name}
                            type="button"
                            disabled={busy !== null}
                            onClick={() => pick(name)}
                            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-dashed border-rb-gold bg-rb-gold-bg px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-rb-gold/20 disabled:opacity-60"
                        >
                            <Plus className="h-3 w-3 text-rb-amber" strokeWidth={2.5} aria-hidden="true" />
                            {busy === name ? 'Ekleniyor…' : name}
                        </button>
                    ))}
                </div>
            )}

            {(action || link) && (
                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                    {action && (
                        <button
                            type="button"
                            onClick={action.onClick}
                            className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-rb-gold px-4 text-sm font-semibold text-rb-gold-foreground transition-opacity hover:opacity-90"
                        >
                            <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                            {action.label}
                        </button>
                    )}
                    {link && (
                        <Link to={link.to} className="text-sm font-medium text-rb-amber hover:underline">
                            {link.label}
                        </Link>
                    )}
                </div>
            )}

            {hint && (
                <p className="mt-6 inline-flex items-center gap-2 text-xs text-muted-foreground">
                    <Info className="h-3.5 w-3.5" aria-hidden="true" />
                    {hint}
                </p>
            )}
        </section>
    );
}

interface SearchEmptyStateProps {
    /** "mehmet" gibi aranan metin; boşsa "Filtreyle eşleşen ... yok" denir. */
    query?: string;
    /** Tekil isim: "çalışan", "ürün", "kayıt". */
    noun: string;
    onClear?: () => void;
    clearLabel?: string;
    /** Varsayılan "… ile eşleşen … yok" metni yerine özel başlık/açıklama. */
    title?: string;
    description?: string;
    bare?: boolean;
    className?: string;
}

// Veri var ama arama/filtre hiçbir şeyle eşleşmedi: gri, kompakt, "ekle" butonu yok.
export function SearchEmptyState({ query, noun, onClear, clearLabel = 'Aramayı temizle', title, description, bare, className }: SearchEmptyStateProps) {
    return (
        <section
            className={cn(
                'flex flex-col items-center text-center px-6',
                bare ? 'py-8' : 'py-7 rounded-2xl border border-border bg-card',
                className
            )}
        >
            <Search className="h-[26px] w-[26px] text-muted-foreground" strokeWidth={1.8} aria-hidden="true" />
            <p className="mt-2 text-[15px] font-semibold text-foreground">
                {title ?? (query ? `"${query}" ile eşleşen ${noun} yok` : `Filtreyle eşleşen ${noun} yok`)}
            </p>
            <p className="mt-1 text-[13px] text-muted-foreground">
                {description ?? (query ? 'Yazımı kontrol et ya da aramayı temizle.' : 'Filtreyi değiştir ya da temizle.')}
            </p>
            {onClear && (
                <button
                    type="button"
                    onClick={onClear}
                    className="mt-3 h-[34px] rounded-[9px] border border-border px-3.5 text-[13px] font-medium text-foreground transition-colors hover:bg-muted"
                >
                    {clearLabel}
                </button>
            )}
        </section>
    );
}

// <table> içinde: başlık satırı kalır, boş durum tek hücreye yayılır.
export function EmptyStateRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
    return (
        <tr>
            <td colSpan={colSpan} className="p-0">{children}</td>
        </tr>
    );
}
