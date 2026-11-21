import { useEffect, useRef, type ReactNode } from 'react';
import { Armchair, Flame, LayoutGrid, List, Search, SlidersHorizontal, Star, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { applyFilters, searchItems, SET_MENU_CATEGORY, POPULAR_MIN, type BindItem, type QrCategory, type QrFilters, type QrItem } from './qrModel';
import { BrandMark, CategoryGlyph, ItemCard, ItemRow, SectionHeader } from './QrParts';
import { useViewPreference } from './useQrPrefs';
import { column, displayTitle, focusRing } from './qrUi';

/** Ana sayfada kategori başına en fazla bu kadar satır; fazlası "Tümünü Gör" ile o kategorinin görünümünde. */
const ROWS_PER_SECTION = 4;
const MENUS_ON_HOME = 4;

/** Kategori şeridinin yeri: kategori değişince sayfa şeridin altından başlasın diye (TableOrderPage ölçer). */
export const CATEGORY_STRIP_ANCHOR = 'qr-kategori-seridi';

interface Props {
    restaurant: string;
    subtitle: string;
    tableName: string;
    regionName: string;
    categories: QrCategory[];
    /** Seçili kategori (?kategori=); null: "Tümü" (ana sayfa). */
    categoryId: string | null;
    /** Şeritten ya da "Tümünü Gör"den kategori seçimi; null: "Tümü". */
    onSelectCategory: (id: string | null) => void;
    /** "Öne Çıkanlar" (admin kapattıysa boş). */
    featured: QrItem[];
    /** "Popüler Lezzetler" (ayar kapalıysa ya da yeterli satış yoksa boş). */
    popular: QrItem[];
    query: string;
    onQuery: (query: string) => void;
    filters: QrFilters;
    filterCount: number;
    onOpenFilters: () => void;
    onClearFilters: () => void;
    bind: BindItem;
    /** Kapalı / QR siparişi kilitli / sipariş kapalı / bağlantı yok bilgisi. */
    notice: ReactNode;
    /** Menü boşken gösterilecek içerik. */
    empty: ReactNode;
}

// Menü sekmesi: başlık (logo, restoran, masa), arama + süzgeç ve kategori şeridi her zaman yerinde; şerit kaydırınca
// üstte yapışık kalır. "Tümü" seçiliyken "Öne Çıkanlar", "Popüler Lezzetler", hazır menüler ve kategoriler (kısa
// liste); bir kategori seçilince aynı sayfada yalnız o kategorinin kalemleri (ızgara/liste). Arama seçili kategori
// içinde (ya da "Tümü"nde bütün menüde) yapılır; yazılınca bölümlerin yerine sonuçlar gelir.
export default function QrHome({
    restaurant, subtitle, tableName, regionName, categories, categoryId, onSelectCategory, featured, popular, query, onQuery,
    filters, filterCount, onOpenFilters, onClearFilters, bind, notice, empty,
}: Props) {
    const [view, setView] = useViewPreference();
    const stripRef = useRef<HTMLUListElement>(null);
    const category = categoryId ? categories.find(c => c.id === categoryId) ?? null : null;
    const searching = query.trim().length > 0;
    const results = searching ? applyFilters(searchItems(category ? [category] : categories, query), filters) : [];

    // Seçili çip şeritte görünür kalır (uzun şeritte sağda kalan kategori).
    useEffect(() => {
        const chip = stripRef.current?.querySelector<HTMLElement>('[aria-current="true"]');
        chip?.scrollIntoView({ block: 'nearest', inline: 'center' });
    }, [category?.id]);

    return (
        <div className={cn(column, 'px-4')}>
            <header className="flex items-center gap-3 pb-4 pt-4">
                <BrandMark className="h-12 w-12" />
                <div className="min-w-0 flex-1">
                    <h1 className={cn(displayTitle, 'truncate text-[21px]')}>{restaurant}</h1>
                    {subtitle && <p className="m-0 mt-0.5 truncate text-[13px] text-[var(--site-sub)]">{subtitle}</p>}
                </div>
                <p className="m-0 flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-[var(--site-accent-soft)] px-3 text-[13px] font-extrabold text-[var(--site-accent-text)]">
                    <Armchair className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only">Masanız: </span>{tableName}
                    {regionName && <span className="sr-only">, {regionName}</span>}
                </p>
            </header>

            <div className="flex items-center gap-2">
                <label className="relative min-w-0 flex-1">
                    <span className="sr-only">{category ? `${category.name} içinde ara` : 'Menüde ara'}</span>
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[var(--site-muted)]" aria-hidden="true" />
                    <input
                        type="search"
                        value={query}
                        onChange={e => onQuery(e.target.value)}
                        placeholder={category ? `${category.name} içinde ara…` : 'Menüde ara…'}
                        enterKeyHint="search"
                        className="h-12 w-full rounded-2xl border border-[var(--site-border-mid)] bg-[var(--site-card)] pl-11 pr-11 text-[15px] text-[var(--site-text)] placeholder:text-[var(--site-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--site-focus)] [&::-webkit-search-cancel-button]:hidden"
                    />
                    {query && (
                        <button type="button" onClick={() => onQuery('')} aria-label="Aramayı temizle"
                            className={cn('absolute right-0.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-[var(--site-sub)]', focusRing)}>
                            <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                    )}
                </label>
                <button type="button" onClick={onOpenFilters} aria-label={filterCount > 0 ? `Süzgeç, ${filterCount} seçili` : 'Süzgeç ve sıralama'}
                    className={cn('relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition-colors', focusRing,
                        filterCount > 0 ? 'border-[var(--site-accent)] bg-[var(--site-accent-soft)] text-[var(--site-accent-text)]' : 'border-[var(--site-border-mid)] bg-[var(--site-card)] text-[var(--site-text)]')}>
                    <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
                    {filterCount > 0 && (
                        <span aria-hidden="true" className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--site-accent)] px-1 text-[11px] font-extrabold text-[var(--site-on-accent)]">{filterCount}</span>
                    )}
                </button>
            </div>

            {notice}

            {categories.length === 0 ? empty : (
                <>
                    <div id={CATEGORY_STRIP_ANCHOR} aria-hidden="true" className="h-0" />
                    <nav aria-label="Kategoriler"
                        className="sticky top-0 z-20 -mx-4 mt-2 bg-[color-mix(in_srgb,var(--site-bg)_94%,transparent)] pb-2 pt-2 backdrop-blur-[10px]">
                        <ul ref={stripRef} className="m-0 flex list-none gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                            <li className="shrink-0">
                                <CategoryTile active={!category} label="Tümü" icon={<LayoutGrid className="h-[22px] w-[22px]" />}
                                    onClick={() => { if (category) onSelectCategory(null); }} />
                            </li>
                            {categories.map(c => (
                                <li key={c.id} className="shrink-0">
                                    <CategoryTile active={c.id === category?.id} label={c.name} icon={<CategoryGlyph category={c} className="h-[22px] w-[22px]" />}
                                        onClick={() => { if (c.id !== category?.id) onSelectCategory(c.id); }} />
                                </li>
                            ))}
                        </ul>
                    </nav>

                    {searching ? (
                        <section aria-labelledby="arama-sonuclari" className="mt-3">
                            <h2 id="arama-sonuclari" className="m-0 text-sm font-bold text-[var(--site-sub)]" aria-live="polite">
                                {results.length > 0
                                    ? `“${query.trim()}” için ${category ? `${category.name} içinde ` : ''}${results.length} sonuç`
                                    : `“${query.trim()}” için ${category ? `${category.name} içinde ` : ''}sonuç yok`}
                            </h2>
                            {results.length > 0 ? (
                                <ul className="m-0 mt-1 list-none divide-y divide-[var(--site-border)] p-0">
                                    {results.map(item => <li key={item.key}><ItemRow item={item} {...bind(item)} /></li>)}
                                </ul>
                            ) : (
                                <EmptyHint text={filterCount > 0 ? 'Süzgeç bazı ürünleri gizliyor olabilir.' : category ? 'Başka bir sözcük deneyin ya da "Tümü"nde arayın.' : 'Başka bir sözcük deneyin ya da kategorilere göz atın.'}
                                    action={filterCount > 0 ? { label: 'Süzgeci temizle', onClick: onClearFilters }
                                        : category ? { label: 'Bütün menüde ara', onClick: () => onSelectCategory(null) }
                                            : { label: 'Aramayı temizle', onClick: () => onQuery('') }} />
                            )}
                        </section>
                    ) : category ? (
                        <CategoryView category={category} filters={filters} onClearFilters={onClearFilters}
                            bind={bind} view={view} onView={setView} />
                    ) : (
                        <HomeSections categories={categories} featured={featured} popular={popular} filters={filters} filterCount={filterCount}
                            onClearFilters={onClearFilters} bind={bind} onSelectCategory={onSelectCategory} />
                    )}
                </>
            )}
        </div>
    );
}

/** "Tümü": vitrinler (süzgeç yokken), hazır menüler ve her kategoriden kısa liste. */
function HomeSections({ categories, featured, popular, filters, filterCount, onClearFilters, bind, onSelectCategory }: {
    categories: QrCategory[]; featured: QrItem[]; popular: QrItem[]; filters: QrFilters; filterCount: number;
    onClearFilters: () => void; bind: BindItem; onSelectCategory: (id: string) => void;
}) {
    const filtered = categories
        .map(c => ({ ...c, items: applyFilters(c.items, filters) }))
        .filter(c => c.items.length > 0);
    const menuSection = filtered.find(c => c.id === SET_MENU_CATEGORY);
    const productSections = filtered.filter(c => c.id !== SET_MENU_CATEGORY);
    // Vitrinler süzgeç yokken; öne çıkanda olan kalem popülerde tekrar edilmez.
    const showcases = filterCount === 0;
    const featuredKeys = new Set(featured.map(item => item.key));
    const popularRest = popular.filter(item => !featuredKeys.has(item.key));
    const popularShown = popularRest.length >= POPULAR_MIN ? popularRest : [];

    return (
        <>
            {showcases && featured.length > 0 && (
                <Showcase id="bolum-one-cikanlar" title="Öne Çıkanlar" icon={<Star className="h-5 w-5" />} items={featured} bind={bind} eager />
            )}
            {showcases && popularShown.length > 0 && (
                <Showcase id="bolum-populer" title="Popüler Lezzetler" icon={<Flame className="h-5 w-5" />} items={popularShown} bind={bind} />
            )}

            {filtered.length === 0 && (
                <EmptyHint text="Seçili süzgece uyan ürün yok." action={{ label: 'Süzgeci temizle', onClick: onClearFilters }} />
            )}

            {menuSection && (
                <section aria-labelledby="bolum-menuler" className="mt-6">
                    <SectionHeader id="bolum-menuler" title="Menüler" icon={<CategoryGlyph category={menuSection} className="h-5 w-5" />}
                        onSeeAll={menuSection.items.length > MENUS_ON_HOME ? () => onSelectCategory(SET_MENU_CATEGORY) : undefined} />
                    <ul className="m-0 mt-3 grid list-none grid-cols-2 gap-3 p-0">
                        {menuSection.items.slice(0, MENUS_ON_HOME).map(item => (
                            <li key={item.key} className="flex [&>article]:w-full"><ItemCard item={item} {...bind(item)} /></li>
                        ))}
                    </ul>
                </section>
            )}

            {productSections.map(section => {
                const more = section.items.length > ROWS_PER_SECTION + 1;
                const shown = more ? section.items.slice(0, ROWS_PER_SECTION) : section.items;
                return (
                    <section key={section.id} aria-labelledby={`bolum-${section.id}`} className="mt-7">
                        <SectionHeader id={`bolum-${section.id}`} title={section.name} icon={<CategoryGlyph category={section} className="h-5 w-5" />}
                            onSeeAll={() => onSelectCategory(section.id)}
                            seeAllLabel={more ? `Tümünü Gör (${section.items.length})` : 'Tümünü Gör'} />
                        <ul className="m-0 mt-1 list-none divide-y divide-[var(--site-border)] p-0">
                            {shown.map(item => <li key={item.key}><ItemRow item={item} {...bind(item)} /></li>)}
                        </ul>
                    </section>
                );
            })}
        </>
    );
}

/** Seçili kategori: başlık ve adet, ızgara/liste görünümü ve kalemler. */
function CategoryView({ category, filters, onClearFilters, bind, view, onView }: {
    category: QrCategory; filters: QrFilters; onClearFilters: () => void; bind: BindItem;
    view: 'grid' | 'list'; onView: (view: 'grid' | 'list') => void;
}) {
    const items = applyFilters(category.items, filters);
    return (
        <section aria-labelledby="secili-kategori" className="mt-2">
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <h2 id="secili-kategori" className={cn(displayTitle, 'truncate text-[22px]')}>{category.name}</h2>
                    <p className="m-0 mt-0.5 text-[13px] font-semibold text-[var(--site-sub)]" aria-live="polite">{items.length} ürün</p>
                </div>
                <div role="group" aria-label="Görünüm" className="flex shrink-0 items-center rounded-full border border-[var(--site-border)] bg-[var(--site-card)] p-0.5">
                    <ViewButton active={view === 'grid'} label="Izgara görünümü" onClick={() => onView('grid')}><LayoutGrid className="h-[18px] w-[18px]" /></ViewButton>
                    <ViewButton active={view === 'list'} label="Liste görünümü" onClick={() => onView('list')}><List className="h-[18px] w-[18px]" /></ViewButton>
                </div>
            </div>

            {items.length === 0 ? (
                <EmptyHint text="Seçili süzgece uyan ürün yok." action={{ label: 'Süzgeci temizle', onClick: onClearFilters }} />
            ) : view === 'grid' ? (
                <ul className="m-0 mt-3 grid list-none grid-cols-2 gap-3 p-0">
                    {items.map(item => (
                        <li key={item.key} className="flex [&>article]:w-full"><ItemCard item={item} {...bind(item)} /></li>
                    ))}
                </ul>
            ) : (
                <ul className="m-0 mt-1 list-none divide-y divide-[var(--site-border)] p-0">
                    {items.map(item => <li key={item.key}><ItemRow item={item} {...bind(item)} /></li>)}
                </ul>
            )}
        </section>
    );
}

function CategoryTile({ label, icon, active = false, onClick }: { label: string; icon: ReactNode; active?: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-current={active ? 'true' : undefined}
            className={cn('flex h-[68px] min-w-[72px] max-w-[112px] flex-col items-center justify-center gap-1 rounded-2xl border px-2.5 text-[12px] font-bold leading-tight transition-colors', focusRing,
                active ? 'border-[var(--site-accent)] bg-[var(--site-accent)] text-[var(--site-on-accent)]'
                    : 'border-[var(--site-border)] bg-[var(--site-card)] text-[var(--site-text)] hover:border-[var(--site-border-strong)]')}
        >
            <span aria-hidden="true" className={active ? '' : 'text-[var(--site-accent-text)]'}>{icon}</span>
            <span className="w-full truncate text-center">{label}</span>
        </button>
    );
}

function ViewButton({ active, label, onClick, children }: { active: boolean; label: string; onClick: () => void; children: ReactNode }) {
    return (
        <button type="button" onClick={onClick} aria-pressed={active} aria-label={label}
            className={cn('flex h-10 w-11 items-center justify-center rounded-full transition-colors', focusRing,
                active ? 'bg-[var(--site-accent)] text-[var(--site-on-accent)]' : 'text-[var(--site-sub)] hover:text-[var(--site-text)]')}>
            <span aria-hidden="true">{children}</span>
        </button>
    );
}

function EmptyHint({ text, action }: { text: string; action: { label: string; onClick: () => void } }) {
    return (
        <div className="flex flex-col items-center py-12 text-center">
            <p className="m-0 max-w-xs text-[15px] text-[var(--site-sub)]">{text}</p>
            <button type="button" onClick={action.onClick}
                className={cn('mt-3 min-h-11 rounded-full px-4 text-sm font-bold text-[var(--site-accent-text)] underline underline-offset-4', focusRing)}>
                {action.label}
            </button>
        </div>
    );
}

/**
 * Büyük fotoğraflı vitrin (Öne Çıkanlar, Popüler): iki sütunlu kart ızgarası. Tek sayıda kalem varsa ilki iki sütunu
 * kaplar, ızgarada boşluk kalmaz. İlk bölümün görselleri hemen yüklenir (ekranın üstünde).
 */
function Showcase({ id, title, icon, items, bind, eager = false }: {
    id: string; title: string; icon: ReactNode; items: QrItem[]; bind: BindItem; eager?: boolean;
}) {
    const odd = items.length % 2 === 1;
    return (
        <section aria-labelledby={id} className="mt-4">
            <SectionHeader id={id} title={title} icon={icon} />
            <ul className="m-0 mt-3 grid list-none grid-cols-2 gap-3 p-0">
                {items.map((item, i) => {
                    const wide = odd && i === 0;
                    return (
                        <li key={item.key} className={cn('flex [&>article]:w-full', wide && 'col-span-2')}>
                            <ItemCard item={item} wide={wide} showFeaturedBadge={false} eager={eager && i < 3} {...bind(item)} />
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
