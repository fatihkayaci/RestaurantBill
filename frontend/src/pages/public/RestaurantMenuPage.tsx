import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ProductTile, SiteShell, SiteStatus } from './site/SiteChrome';
import { HeaderSpacer, SitePage } from './site/SiteFrame';
import { container, glass, headingFont } from './site/siteTheme';
import { hoursText, restaurantName, useSite } from './site/useSite';

// Restoran sitesinin menü sayfası (tasarım: canvas "Restoran Sitesi v2" · Kafe sitesi · menü sayfası).
// Sepet ve sipariş yok: menü yalnızca gösterilir (arama, kategori çubuğu, fotoğraflı kartlar).
export default function RestaurantMenuPage() {
    const { site, error } = useSite();
    const [query, setQuery] = useState('');

    const groups = useMemo(() => {
        if (!site) return [];
        const q = query.trim().toLocaleLowerCase('tr-TR');
        return site.categories
            .map(category => ({
                id: `kat-${category.id}`,
                name: category.name,
                items: q
                    ? category.products.filter(p => `${p.name} ${p.description} ${category.name}`.toLocaleLowerCase('tr-TR').includes(q))
                    : category.products,
            }))
            .filter(g => g.items.length > 0);
    }, [site, query]);

    if (!site) {
        return <SiteShell><SiteStatus error={error} /></SiteShell>;
    }

    const content = site.site;
    const name = restaurantName(site);
    const hours = hoursText(site);
    const totalItems = site.categories.reduce((sum, c) => sum + c.products.length, 0);
    const status = site.isOpenNow === null ? null : site.isOpenNow ? 'Şu an açık' : 'Şu an kapalı';

    return (
        // Başlık ve alt bilgi sitenin diğer sayfalarıyla ortak (SiteFrame); menünün gövdesi Inter Tight kalır.
        <SitePage site={site} current="menu" className="bg-[var(--site-bg)]" stickyHeader={false}>
            {/* Fotoğraflı başlık; site başlığı bunun üstünde durur ve kaydırınca sayfayla gider (sabit kalan yalnız kategori çubuğu) */}
            <section className="relative overflow-hidden bg-[var(--site-ink)] text-white">
                {content.coverImageUrl && (
                    <img src={content.coverImageUrl} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
                )}
                {content.coverImageUrl && <div aria-hidden="true" className="absolute inset-0 bg-[rgba(17,17,17,0.6)]" />}
                <HeaderSpacer />
                <div className={cn(container, 'relative flex flex-wrap items-end justify-between gap-7 pb-10 pt-12 md:pb-12 md:pt-[72px]')}>
                    <div className="flex flex-col gap-2.5">
                        <h1 className="m-0 text-[72px] font-bold leading-[0.9] tracking-[-0.06em] md:text-[112px]">Menü</h1>
                        <span className="text-lg text-white/90">
                            {[status, hours && `Her gün ${hours}`, `${totalItems} ürün`].filter(Boolean).join(' · ')}
                        </span>
                    </div>
                    <label className={cn(glass, 'flex h-[52px] w-full max-w-[340px] items-center gap-2.5 rounded-full border-white/25 px-[18px]')}>
                        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
                        <span className="sr-only">Menüde ara</span>
                        <input
                            type="search"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Menüde ara…"
                            className="min-w-0 flex-1 border-0 bg-transparent text-[15px] text-white outline-none placeholder:text-white/75"
                        />
                    </label>
                </div>
            </section>

            {/* Kategori çubuğu */}
            {groups.length > 1 && (
                <nav aria-label="Kategoriler" className="sticky top-0 z-20 border-b border-[var(--site-border)] bg-[rgba(255,255,255,0.92)] backdrop-blur-[14px]">
                    <div className={cn(container, 'flex gap-2 overflow-x-auto py-3.5 [scrollbar-width:none]')}>
                        {groups.map(g => (
                            <a key={g.id} href={`#${g.id}`}
                                className="flex h-[42px] shrink-0 items-center rounded-full border border-[#EAEAEA] bg-[#FFFFFF] px-[18px] text-[15px] font-semibold text-[#111111] no-underline hover:border-[#111111]">
                                {g.name}<span className="ml-1.5 font-medium text-[var(--site-sub)]">{g.items.length}</span>
                            </a>
                        ))}
                    </div>
                </nav>
            )}

            {/* Ürünler */}
            <main className={cn(container, 'flex flex-col gap-14 pb-28 pt-12 text-[var(--site-text)]')}>
                {site.categories.length === 0 ? (
                    <p className="m-0 text-lg text-[var(--site-sub)]">Menü henüz hazırlanıyor.</p>
                ) : groups.length === 0 ? (
                    <p className="m-0 text-lg text-[var(--site-sub)]">“{query}” için sonuç yok. Başka bir şey deneyin.</p>
                ) : groups.map(g => (
                    <section key={g.id} id={g.id} aria-labelledby={`${g.id}-baslik`} className="flex scroll-mt-[88px] flex-col gap-[18px]">
                        <h2 id={`${g.id}-baslik`} className={cn(headingFont, 'm-0 text-[30px] font-bold md:text-[36px]')}>{g.name}</h2>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(240px,1fr))] sm:gap-3.5">
                            {g.items.map(p => (
                                <ProductTile key={p.id} product={p} restaurant={name} tag={p.isFeatured ? 'Ustanın seçimi' : undefined} />
                            ))}
                        </div>
                    </section>
                ))}
                <p className="m-0 text-sm text-[var(--site-sub)]">
                    Sipariş için masanızdaki QR kodu okutun{site.phone ? ' ya da bizi arayın' : ''}. <Link to="/" className="font-semibold text-[var(--site-text)] underline">Ana sayfa</Link>
                </p>
            </main>

        </SitePage>
    );
}
