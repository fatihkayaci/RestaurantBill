import { useEffect, useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
    RESERVATION_CANCELLED, RESERVATION_CONFIRMED, RESERVATION_NO_SHOW, RESERVATION_PENDING, RESERVATION_REJECTED, RESERVATION_SEATED,
    type PublicProduct, type ReservationStatusInfo,
} from '@/features/customerSite/types';
import { RESERVATION_LOOKUP_PATH } from '@/features/customerSite/reservationCode';
import { cn } from '@/lib/utils';
import {
    container, formatDay, formatSitePrice, headingFont, resolveDesign, siteFontsHref, siteRootStyle, wordmarkParts,
} from './siteTheme';
import { SiteDesignContext } from './siteDesign';

// Restoran sitesinin ortak parçaları (tasarım: canvas "Restoran Sitesi v2" · Kafe sitesi).

/** Sitenin kökü: tasarımın ve temanın renk değişkenleri (`design` "renkli" | "sade", `theme` hazır tema anahtarı,
 *  `accent` özel vurgu rengi; boşsa varsayılanlar), tasarımın yazı tipleri ve tasarım bağlamı (useSiteDesign). */
export function SiteShell({ accent, theme, design, children }: { accent?: string; theme?: string; design?: string; children: ReactNode }) {
    const key = resolveDesign(design);
    // Site açıkken sayfanın tamamı (zemin, bildirimler, pencereler) Manrope; personel ekranına dönünce kalkar.
    // Sınıf sitenin çizildiği belgeye eklenir (admin'deki önizleme çerçevesinde çerçevenin belgesi, admin değil).
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const root = (ref.current?.ownerDocument ?? document).documentElement;
        root.classList.add('restaurant-site');
        return () => root.classList.remove('restaurant-site');
    }, []);
    return (
        <div ref={ref} style={siteRootStyle(accent, theme, key)} data-site-design={key} className="flex min-h-screen flex-col text-base leading-normal">
            <link rel="stylesheet" href={siteFontsHref(key)} precedence="default" />
            <SiteDesignContext.Provider value={key}>{children}</SiteDesignContext.Provider>
        </div>
    );
}

/** "Dost●Kafe": restoran adının kelimeleri arasında vurgu renginde nokta. */
export function Wordmark({ name, className }: { name: string; className?: string }) {
    const { first, rest } = wordmarkParts(name);
    return (
        <span className={cn('font-extrabold tracking-[-0.04em]', className)}>
            {first}
            <span aria-hidden="true" className="text-[var(--site-accent)]">●</span>
            {rest && <><span className="sr-only"> </span>{rest}</>}
        </span>
    );
}

/**
 * Restoranın logosu. Sistemde henüz logo görseli alanı yok; bu yüzden şimdilik hep yazı logosu (Wordmark) çizilir.
 * Logo görseli eklenirse `logoUrl` verilir ve `imageClassName` boyutu belirler.
 */
export function SiteLogo({ name, logoUrl, className, imageClassName }: { name: string; logoUrl?: string | null; className?: string; imageClassName?: string }) {
    return logoUrl
        ? <img src={logoUrl} alt={name} className={cn('block h-auto object-contain', imageClassName)} />
        : <Wordmark name={name} className={className} />;
}

/**
 * Görsel yuvası: fotoğraf varsa fotoğraf; yoksa aynı oran ve köşede açık gri (#F2F2F0) kutu, ortasında restoranın logosu.
 * Kutuya ürün adı yazılmaz; ad her zaman kutunun altında durur. Yazı logosu 22px, dar kutuda (telefonda iki sütun menü)
 * kelime ortasından bölünmesin diye kutu genişliğine göre küçülür.
 */
export function ImageSlot({ src, alt, restaurant, className, logoTextClassName = 'text-[min(22px,14cqw)]' }: {
    src?: string | null; alt: string; restaurant: string; className: string; logoTextClassName?: string;
}) {
    return src ? (
        <img src={src} alt={alt} loading="lazy" className={cn('block w-full bg-[var(--site-placeholder)] object-cover', className)} />
    ) : (
        <div role="img" aria-label={alt} className={cn('@container flex w-full items-center justify-center bg-[var(--site-placeholder)] px-3 text-center', className)}>
            <SiteLogo
                name={restaurant}
                imageClassName="max-w-[40%] opacity-90 grayscale"
                className={cn('min-w-0 break-words leading-tight text-[var(--site-text)]', logoTextClassName)}
            />
        </div>
    );
}

interface ProductCardProps {
    product: PublicProduct;
    restaurant: string;
    imageClassName: string;
    tag?: string;
    /** Alt satırın sağı (fiyatın karşısı). Sipariş kapalı: ana sayfada menüye bağlantı, menü sayfasında boş. */
    action?: ReactNode;
}

/** Ürün kartı: beyaz kart, 1px #EAEAEA çizgi, köşe 22, iç boşluk 10; görselin altında ad, açıklama (varsa), fiyat. */
function ProductCard({ product, restaurant, imageClassName, tag, action }: ProductCardProps) {
    return (
        <article className="flex flex-col gap-3 rounded-[22px] border border-[var(--site-border)] bg-[var(--site-card)] p-2.5">
            <div className="relative">
                <ImageSlot src={product.imageUrl} alt={product.name} restaurant={restaurant}
                    className={cn('rounded-2xl', imageClassName)} />
                {tag && (
                    <span className="absolute left-2.5 top-2.5 rounded-full border border-[var(--site-border)] bg-[var(--site-card)] px-2.5 py-1 text-xs font-bold text-[var(--site-text)]">{tag}</span>
                )}
            </div>
            <div className="flex min-w-0 flex-col gap-0.5 px-1.5">
                <span className="text-[17px] font-bold leading-snug text-[var(--site-text)]">{product.name}</span>
                {product.description?.trim() && <span className="text-sm text-[var(--site-sub)]">{product.description}</span>}
            </div>
            <div className="mt-auto flex items-center justify-between gap-3 px-1.5 pb-1.5">
                <span className="whitespace-nowrap font-extrabold">{formatSitePrice(product.price)}</span>
                {action}
            </div>
        </article>
    );
}

/** Menü sayfasının ürün kartı. Sepet yok: menü yalnızca gösterilir, fiyatın karşısı boş kalır. */
export function ProductTile({ product, restaurant, tag }: { product: PublicProduct; restaurant: string; tag?: string }) {
    return <ProductCard product={product} restaurant={restaurant} tag={tag} imageClassName="aspect-square" />;
}

/** Ana sayfadaki "Ustanın seçtikleri" kartı. Sipariş kapalı olduğundan sağdaki eylem menüye bağlantı
 *  (sipariş açılırsa buraya "+ Ekle" düğmesi gelir). */
export function PickCard({ product, restaurant }: { product: PublicProduct; restaurant: string }) {
    return (
        <ProductCard product={product} restaurant={restaurant} imageClassName="aspect-[4/3]"
            action={<Link to="/menu" className="whitespace-nowrap text-sm font-semibold text-[var(--site-text)] no-underline hover:opacity-75">Menüde gör →</Link>} />
    );
}

function statusBadge(status: number): { text: string; className: string } {
    if (status === RESERVATION_CONFIRMED) return { text: 'Onaylandı', className: 'bg-[#DCF2E3] text-[#14532D]' };
    if (status === RESERVATION_REJECTED) return { text: 'Onaylanmadı', className: 'bg-[#FBE1DC] text-[#7F1D1D]' };
    if (status === RESERVATION_CANCELLED) return { text: 'İptal edildi', className: 'bg-[var(--site-raised)] text-[var(--site-sub)]' };
    if (status === RESERVATION_PENDING) return { text: 'Onay bekliyor', className: 'bg-[#FCEBC7] text-[#713F12]' };
    if (status === RESERVATION_SEATED) return { text: 'Geldiniz', className: 'bg-[#DCF2E3] text-[#14532D]' };
    if (status === RESERVATION_NO_SHOW) return { text: 'Gelinmedi', className: 'bg-[var(--site-raised)] text-[var(--site-sub)]' };
    return { text: 'Kayıtlı', className: 'bg-[var(--site-raised)] text-[var(--site-sub)]' };
}

export function MyReservations({ items, className }: { items: ReservationStatusInfo[]; className?: string }) {
    if (items.length === 0) return null;
    return (
        <section aria-label="Rezervasyon talepleriniz" className={cn('flex flex-col gap-2.5', className)}>
            <h2 className={cn(headingFont, 'text-[22px] font-bold')}>Rezervasyon talepleriniz</h2>
            <ul className="flex flex-col gap-2">
                {items.map(reservation => {
                    const badge = statusBadge(reservation.status);
                    return (
                        <li key={reservation.accessToken}>
                            <Link
                                to={`/rezervasyon/${reservation.accessToken}`}
                                className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--site-border)] bg-[var(--site-card)] p-4 text-[var(--site-text)] no-underline transition-colors hover:border-[var(--site-border-strong)]"
                            >
                                <div className="min-w-0">
                                    <p className="text-[15px] font-semibold">
                                        {formatDay(reservation.date)} · <span className="tabular-nums">{reservation.time}–{reservation.endTime}</span>
                                    </p>
                                    <p className="text-sm text-[var(--site-sub)]">
                                        {reservation.tableName} · {reservation.partySize} kişi
                                        {reservation.code && <> · Kod <span className="font-mono font-semibold tracking-[0.06em] text-[var(--site-text)]">{reservation.code}</span></>}
                                    </p>
                                    <p className="mt-1 text-sm font-semibold text-[var(--site-accent-text)]">Rezervasyon ve ön sipariş →</p>
                                </div>
                                <span className={cn('shrink-0 rounded-full px-3 py-1.5 text-xs font-bold', badge.className)}>{badge.text}</span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
            <p className="text-sm text-[var(--site-sub)]">
                Burada görmüyor musunuz?{' '}
                <Link to={RESERVATION_LOOKUP_PATH} className="font-semibold text-[var(--site-accent-text)] underline-offset-4 hover:underline">Kodla sorgulayın</Link>
            </p>
        </section>
    );
}

/** Yüklenirken ve hata durumunda sitenin iskeleti. */
export function SiteStatus({ error }: { error: string | null }) {
    if (error) {
        return (
            <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                <h1 className={cn(headingFont, 'text-3xl font-bold')}>Sayfa açılamadı</h1>
                <p className="mt-2 max-w-sm text-base text-[var(--site-sub)]">{error}</p>
                <Link to="/login" className="mt-6 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--site-sub)] underline">Personel girişi</Link>
            </main>
        );
    }
    return (
        <main className="flex-1" aria-busy="true">
            <div className="h-[68px] border-b border-[var(--site-line)]" />
            <div className="mx-auto mt-16 h-[260px] w-[min(900px,90%)] animate-pulse rounded-[28px] bg-[var(--site-placeholder)] md:h-[360px]" />
            <div className={cn(container, 'grid grid-cols-2 gap-4 py-12 md:grid-cols-4')}>
                {[...Array(4)].map((_, i) => <div key={i} className="aspect-square animate-pulse rounded-[22px] bg-[var(--site-raised)]" />)}
            </div>
        </main>
    );
}
