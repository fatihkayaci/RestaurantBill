import { Link } from 'react-router-dom';
import { getTenantSlug } from '@/lib/tenant';
import { cn } from '@/lib/utils';
import { SiteShell } from './site/SiteChrome';
import { SitePage } from './site/SiteFrame';
import { headingFont } from './site/siteTheme';
import { useDocumentTitle, useSite } from './site/useSite';

// Bulunamayan adres (App.tsx'teki "*" rotası; /qr, /masa gibi eksik ya da yanlış adresler) ve geçersiz masa QR'ı
// (TableOrderPage). Restoranın alan adında sitenin kendi çerçevesi ve teması (SitePage: başlık, alt bilgi, --site-*
// renkleri); site alınamazsa ya da Sophram'ın kendi alan adındaysa sade krem ekran. Her durumda "Ana sayfaya dön".

export type NotFoundKind = 'page' | 'qr';

const COPY: Record<NotFoundKind, { eyebrow: string; title: string; text: string }> = {
    page: {
        eyebrow: '404',
        title: 'Sayfa bulunamadı',
        text: 'Aradığınız sayfa kaldırılmış ya da adresi değişmiş olabilir. Adresi kontrol edin ya da ana sayfadan devam edin.',
    },
    qr: {
        eyebrow: 'Masa QR kodu',
        title: 'Bu QR kod geçersiz',
        text: 'Kod eski olabilir ya da bu masa artık kullanılmıyor. Garsona haber verin; menüye ana sayfadan da ulaşabilirsiniz.',
    },
};

export default function NotFoundPage({ kind = 'page' }: { kind?: NotFoundKind }) {
    // Yerel geliştirmede alt alan adı yok ama API varsayılan restoranı (demo) döndürür: site denenir.
    const tenant = !!getTenantSlug() || import.meta.env.DEV;
    return tenant ? <TenantNotFound kind={kind} /> : <PlainNotFound kind={kind} />;
}

function TenantNotFound({ kind }: { kind: NotFoundKind }) {
    const { site, error } = useSite();
    if (error) return <PlainNotFound kind={kind} />;
    if (!site) return <SiteShell><div className="min-h-screen bg-[var(--site-bg)]" aria-busy="true" /></SiteShell>;
    return (
        // Sekme başlığı SitePage'den: "Sayfa bulunamadı · <restoran>" / "Bu QR kod geçersiz · <restoran>".
        <SitePage site={site} current={kind === 'qr' ? 'qr-gecersiz' : 'bulunamadi'} mobileActions={[]}>
            <NotFoundBody kind={kind} />
        </SitePage>
    );
}

function NotFoundBody({ kind }: { kind: NotFoundKind }) {
    const copy = COPY[kind];
    return (
        <main className="flex flex-1 items-center justify-center px-4 py-20 sm:py-28">
            <div className="flex w-full max-w-[460px] flex-col items-center text-center">
                <p className="m-0 text-[13px] font-bold uppercase tracking-[0.24em] text-[var(--site-accent-text,var(--site-accent))]">{copy.eyebrow}</p>
                <h1 className={cn(headingFont, 'm-0 mt-3 text-[34px] leading-tight text-[var(--site-text)] sm:text-[44px]')}>{copy.title}</h1>
                <p className="m-0 mt-3 text-[16px] leading-relaxed text-[var(--site-sub)]">{copy.text}</p>
                <Link to="/" className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[var(--site-accent)] px-7 text-[16px] font-bold text-[var(--site-on-accent)] no-underline transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-focus)] focus-visible:ring-offset-2 sm:w-auto">
                    Ana sayfaya dön
                </Link>
            </div>
        </main>
    );
}

/** Site teması olmadan (Sophram'ın alan adı ya da site alınamadı): ClosedRestaurantGate ile aynı sade krem ekran. */
function PlainNotFound({ kind }: { kind: NotFoundKind }) {
    const copy = COPY[kind];
    useDocumentTitle(`${copy.title} · Sophram`);
    return (
        <main className="flex min-h-screen items-center justify-center bg-[#F6F1EA] px-4 text-center text-[#2B2520]">
            <div className="flex w-full max-w-[420px] flex-col items-center">
                <p className="m-0 text-[13px] font-bold uppercase tracking-[0.24em] text-[#8A5A2B]">{copy.eyebrow}</p>
                <h1 className="m-0 mt-3 font-serif text-[32px] font-bold leading-tight">{copy.title}</h1>
                <p className="m-0 mt-3 text-[15px] leading-relaxed text-[#6B6158]">{copy.text}</p>
                <Link to="/" className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#2B2520] px-7 text-[15px] font-bold text-[#F6F1EA] no-underline hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A2B] focus-visible:ring-offset-2 sm:w-auto">
                    Ana sayfaya dön
                </Link>
            </div>
        </main>
    );
}
