import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import type { PublicProduct } from '@/features/customerSite/types';
import type { OnlineSetMenu, OnlineSetMenuSlot } from '@/features/delivery/types';
import { cn } from '@/lib/utils';
import { eyebrow, line, moreArrow, moreLink, serif } from './siteParts';
import { formatSitePrice } from './siteTheme';
import { StockImageLabel } from '../components/StockImageLabel';
import { productPhotos, savingLabel, setMenuImage, type SetMenuPhoto } from './setMenuParts';

// Ana sayfanın "Menüler" bölümü: restoranın aktif paket menüleri ("Adana Menü") kart olarak.
// Kart: görsel (yoksa menüdeki ilk fotoğraflı ürün, o da yoksa adlı bej panel), ad, fiyat, açıklama ve içerik özeti
// ("Adana Kebap · İçecek: Ayran / Kola (+10 ₺)"). Hiç menü yoksa bölüm çizilmez.
export default function SiteSetMenus({ menus, products, canOrder }: {
    menus: OnlineSetMenu[];
    /** Sitenin ürünleri: menü görseli yoksa içindeki ürünün fotoğrafı kullanılır. */
    products: PublicProduct[];
    /** Online sipariş açıksa başlığın yanında sipariş bağlantısı çıkar. */
    canOrder: boolean;
}) {
    if (menus.length === 0) return null;
    const photoOf = productPhotos(products);

    return (
        <section id="menuler" aria-labelledby="menuler-baslik" className={cn('border-t', line)}>
            <div className="mx-auto flex w-full max-w-[1344px] flex-col gap-12 px-5 py-24 md:gap-16 md:px-12 md:py-[130px]">
                <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
                    <div className="flex min-w-0 flex-col gap-[22px]">
                        <span className={eyebrow}>Menüler</span>
                        <h2 id="menuler-baslik" className={cn(serif, 'm-0 text-[56px] leading-[0.92] tracking-[-0.025em] md:text-[100px]')}>
                            Hazır <span className="italic">menüler.</span>
                        </h2>
                    </div>
                    {canOrder && (
                        <Link to="/siparis" className={cn(moreLink, 'self-auto')}>
                            Paket sipariş ver <span aria-hidden="true" className={moreArrow}>→</span>
                        </Link>
                    )}
                </div>
                <div className="grid grid-cols-1 gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
                    {menus.map(menu => <SetMenuCard key={menu.id} menu={menu} photoOf={photoOf} />)}
                </div>
            </div>
        </section>
    );
}

function SetMenuCard({ menu, photoOf }: { menu: OnlineSetMenu; photoOf: Map<string, SetMenuPhoto> }) {
    const image = setMenuImage(menu, photoOf);
    const saving = savingLabel(menu);

    return (
        <article className="flex min-w-0 flex-col gap-5">
            <div className="relative overflow-hidden rounded">
                {image ? (
                    <img src={image.url} alt={menu.name} loading="lazy"
                        className="block aspect-[4/3] w-full object-cover transition-transform duration-700 hover:scale-[1.04] motion-reduce:transition-none" />
                ) : (
                    <div aria-hidden="true" className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 bg-[#EDE8DF] px-6 text-center">
                        <span className="text-[var(--site-accent)]">✦</span>
                        <span className={cn(serif, 'line-clamp-2 break-words text-[44px] italic leading-[0.95] text-[#141414]')}>{menu.name}</span>
                    </div>
                )}
                {saving && (
                    <span className="absolute right-3 top-3 rounded-full bg-[var(--site-accent)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--site-on-accent)]">
                        {saving}
                    </span>
                )}
                {!menu.isAvailable && (
                    <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-[#141414]">
                        Şu an tükendi
                    </span>
                )}
                {image?.isStock && <StockImageLabel className="bottom-2.5 right-2.5" />}
            </div>
            <div className={cn('flex items-baseline justify-between gap-4 border-b pb-3', line)}>
                <h3 className={cn(serif, 'm-0 min-w-0 break-words text-[34px] leading-none tracking-[-0.01em] md:text-[40px]')}>{menu.name}</h3>
                <span className="flex shrink-0 items-baseline gap-2">
                    {saving && (
                        <s className="text-sm text-[#9E968A]"><span className="sr-only">Normal fiyatı </span>{formatSitePrice(menu.regularPrice)}</s>
                    )}
                    <span className="text-lg font-medium">{saving && <span className="sr-only">Menü fiyatı </span>}{formatSitePrice(menu.price)}</span>
                </span>
            </div>
            {menu.description && <p className="m-0 line-clamp-3 text-[15px] text-[#4A4640]">{menu.description}</p>}
            <SlotsSummary menu={menu} className="text-sm leading-[1.7] text-[#141414]" />
        </article>
    );
}

/**
 * Menü sayfasının yatay menü kartı (kart dili): solda görsel (yoksa adlı bej panel) ve üstünde indirim rozeti,
 * sağda ad, açıklama, içerik özeti ve fiyat (indirimliyse normal fiyat üstü çizili). Dar ekranda görsel üstte.
 */
export function SetMenuRowCard({ menu, photoOf }: { menu: OnlineSetMenu; photoOf: Map<string, SetMenuPhoto> }) {
    const image = setMenuImage(menu, photoOf);
    const saving = savingLabel(menu);
    return (
        <article className="grid min-w-0 grid-cols-1 overflow-hidden rounded-[20px] border border-[#E6E0D6] bg-white text-[#141414] sm:grid-cols-[200px_minmax(0,1fr)] md:rounded-[24px] lg:grid-cols-[220px_minmax(0,1fr)]">
            <div className="relative min-w-0">
                {image ? (
                    <img src={image.url} alt={menu.name} loading="lazy" className="block aspect-[16/9] h-full w-full object-cover sm:aspect-auto sm:min-h-[220px]" />
                ) : (
                    <div aria-hidden="true" className="flex aspect-[16/9] h-full w-full flex-col items-center justify-center gap-2 bg-[#EDE8DF] px-5 text-center sm:aspect-auto sm:min-h-[220px]">
                        <span className="text-[var(--site-accent)]">✦</span>
                        <span className={cn(serif, 'line-clamp-2 break-words text-[32px] italic leading-[0.95]')}>{menu.name}</span>
                    </div>
                )}
                {saving && (
                    <span className="absolute left-3 top-3 rounded-full bg-[var(--site-accent)] px-3 py-1.5 text-xs font-bold text-[var(--site-on-accent)]">{saving}</span>
                )}
                {!menu.isAvailable && (
                    <span className="absolute right-3 top-3 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#141414]">Tükendi</span>
                )}
                {image?.isStock && <StockImageLabel className="bottom-2.5 right-2.5" />}
            </div>
            <div className="flex min-w-0 flex-col gap-2.5 p-5 md:p-6">
                <h3 className={cn(serif, 'm-0 break-words text-[28px] leading-[1.05] md:text-[32px]')}>{menu.name}</h3>
                {menu.description && <p className="m-0 line-clamp-2 text-sm leading-normal text-[#5E5850]">{menu.description}</p>}
                <SlotsSummary menu={menu} className="text-sm leading-normal text-[#5E5850]" />
                <div className="mt-auto flex flex-wrap items-baseline gap-x-2.5 pt-1">
                    <span className="text-2xl font-bold">{saving && <span className="sr-only">Menü fiyatı </span>}{formatSitePrice(menu.price)}</span>
                    {saving && <s className="text-[15px] text-[#6F6A63]"><span className="sr-only">Normal fiyatı </span>{formatSitePrice(menu.regularPrice)}</s>}
                </div>
            </div>
        </article>
    );
}

/** Menünün içerik özeti: "Adana Kebap · İçecek: Ayran / Kola (+10 ₺)". Bölüm yoksa çizilmez. */
export function SlotsSummary({ menu, className }: { menu: OnlineSetMenu; className?: string }) {
    if (menu.slots.length === 0) return null;
    return (
        <p className={cn('m-0', className)}>
            <span className="sr-only">İçindekiler: </span>
            {menu.slots.map((slot, i) => (
                <Fragment key={slot.id}>
                    {i > 0 && <span aria-hidden="true" className="px-1.5 text-[var(--site-accent)]">·</span>}
                    <SlotSummary slot={slot} />
                </Fragment>
            ))}
        </p>
    );
}

// Tek seçenekli bölüm sabit üründür (yalnız adı); çok seçenekliyse "İçecek: Ayran / Kola (+10 ₺)".
function SlotSummary({ slot }: { slot: OnlineSetMenuSlot }) {
    const choice = slot.options.length > 1;
    return (
        <span className="whitespace-normal">
            {choice && <span className="text-[#6F6A63]">{slot.name}: </span>}
            {slot.options.map((o, i) => (
                <Fragment key={o.productId}>
                    {i > 0 && <span className="text-[#6F6A63]"> / </span>}
                    <span className={cn(!o.isAvailable && 'text-[#9E968A] line-through')} title={o.isAvailable ? undefined : 'Tükendi'}>
                        {o.productName}
                        {o.surcharge > 0 && <span className="whitespace-nowrap text-[#6F6A63]"> (+{formatSitePrice(o.surcharge)})</span>}
                    </span>
                </Fragment>
            ))}
        </span>
    );
}
