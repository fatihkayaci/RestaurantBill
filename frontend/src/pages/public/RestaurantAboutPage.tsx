import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { canReserveOnline, type PublicSite } from '@/features/customerSite/types';
import { cn } from '@/lib/utils';
import { StockImageLabel } from './components/StockImageLabel';
import { SiteShell, SiteStatus } from './site/SiteChrome';
import { PageEmpty, SitePage } from './site/SiteFrame';
import { RESERVATION_PATH, formatRating, hasAboutPage, productCount, serif, sinceYear } from './site/siteParts';
import { initials, splitAccent } from './site/siteTheme';
import { hoursLine, restaurantName, useSite } from './site/useSite';
import { AddCard, EditableBlock, EditableText, EmptySlot, ExternalHint, ListCard } from './site/siteEdit';
import { SITE_LIMITS, editTarget, useSiteEdit } from './site/siteEditContext';

// /hakkimizda (tasarım: "Renkli · Hakkımızda", Dergi düzeni). Kapak kapak renginde (krem yazı, hardal italik), hikâye
// kâğıdı krem (hardal alıntı kutusu), usta kutusu zeytin, davet koyu kiremit. Krem sayfada beyaz yuvarlak kutular: (1) kapak: "Hikâyemiz", dev
// serif başlık (slogan; yoksa ad ve kuruluş yılı), kısa giriş; fotoğraf varsa soldan beyaz geçiş, yoksa dev soluk tırnak
// ve halkalar. (2) Hikâye "kâğıdı": solda etiket ve ad, sağda büyük ilk harfle başlayan hikâye; altında ustanın sözü ve
// yalnız gerçek verili rakamlar (yıl, ürün sayısı, salon kapasitesi, Google puanı). (3) Koyu "Mutfağın başında" kutusu
// (usta) + "Değişmeyenlerimiz" (değerler). (4) "Yolculuğumuz" (kilometre taşları). (5) Vurgu renginde davet kutusu.
// Verisi olmayan kutu çizilmez; restoranın girmediği bilgi uydurulmaz.

const box = 'rounded-[24px] bg-[var(--site-card)] text-[var(--site-text)] md:rounded-[32px]';
/** Koyu zeminlerde üst satır: açık hardal (koyu kiremit ve zeytin üstünde 4.5:1). */
const darkLabel = 'text-xs font-extrabold uppercase tracking-[0.24em] text-[var(--site-mustard-text)]';
const label = 'text-xs font-extrabold uppercase tracking-[0.24em] text-[var(--site-accent-text)]';

interface Stat { key: string; value: string; label: string; wrap?: (node: ReactNode) => ReactNode }

/** Yalnız gerçek veriden rakamlar: kaç yıldır, menüdeki ürün sayısı, salon kapasitesi (her masanın kapasitesi girildiyse), Google puanı. */
function stats(site: PublicSite): Stat[] {
    const c = site.site;
    const out: Stat[] = [];
    const years = c.foundedYear ? new Date().getFullYear() - c.foundedYear : 0;
    if (years >= 1) out.push({ key: 'yil', value: String(years), label: 'yıldır sizinle', wrap: n => <EditableBlock target="year" label="Kuruluş yılı" className="h-full">{n}</EditableBlock> });
    const products = productCount(site);
    if (products > 0) out.push({ key: 'urun', value: String(products), label: 'menüdeki lezzet' });
    const tables = site.regions.flatMap(r => r.tables);
    if (tables.length > 0 && tables.every(t => t.capacity && t.capacity > 0)) {
        out.push({ key: 'kapasite', value: String(tables.reduce((sum, t) => sum + (t.capacity ?? 0), 0)), label: 'kişilik salon' });
    }
    if (c.rating !== null) out.push({ key: 'puan', value: formatRating(c.rating), label: 'Google puanı', wrap: n => <EditableBlock target="rating" label="Google puanı" className="h-full">{n}</EditableBlock> });
    return out.slice(0, 4);
}

export default function RestaurantAboutPage() {
    const { site, error } = useSite();
    const edit = useSiteEdit();
    if (!site) return <SiteShell><SiteStatus error={error} /></SiteShell>;

    const showEmpty = Boolean(edit?.showEmpty);

    if (!hasAboutPage(site) && !showEmpty) {
        return (
            <SitePage site={site} current="hakkimizda">
                <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-4 px-2 pb-4 pt-4 sm:px-4">
                    <AboutHero site={site} />
                    <div className={box}><PageEmpty text="Hakkımızda yazısı henüz eklenmedi." /></div>
                </main>
            </SitePage>
        );
    }

    return (
        <SitePage site={site} current="hakkimizda">
            <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-4 px-2 pb-4 pt-4 sm:px-4">
                <AboutHero site={site} />
                <StoryPaper site={site} />
                <FounderAndValues site={site} />
                <Journey site={site} />
                <Invitation site={site} />
            </main>
        </SitePage>
    );
}

// ── 1. Kapak ─────────────────────────────────────────────────────────────────────────────────────

function AboutHero({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const showEmpty = Boolean(edit?.showEmpty);
    const c = site.site;
    const name = restaurantName(site);
    // Sayfanın kendi kapağı; yoksa sitenin kapağı (alt sayfa kapaklarıyla aynı kural).
    const photo = c.aboutHeroUrl || c.coverImageUrl;
    // Başlık: slogan (hikâye başlığı); yoksa "Ad," + "1987'den beri." ya da ad.
    const fallback: [string, string] = c.foundedYear ? [`${name},`, `${sinceYear(c.foundedYear)}.`] : splitAccent(name);
    const [main, accent] = c.storyTitle ? splitAccent(c.storyTitle) : fallback;
    return (
        <section aria-labelledby="hk-baslik"
            className="relative flex min-h-[440px] overflow-hidden rounded-[24px] bg-[var(--site-hero-bg)] text-[var(--site-on-paper)] md:min-h-[560px] md:rounded-[32px]">
            <EditableBlock target="photo:hero-hakkimizda" label="Hakkımızda kapağı" chip="Fotoğrafı değiştir" className="absolute inset-0">
                {photo ? (
                    <>
                        <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover object-[70%_45%]" />
                        <span aria-hidden="true" className="absolute inset-0 bg-[color-mix(in_srgb,var(--site-hero-bg)_86%,transparent)] md:bg-transparent md:bg-[linear-gradient(90deg,color-mix(in_srgb,var(--site-hero-bg)_97%,transparent)_0%,color-mix(in_srgb,var(--site-hero-bg)_90%,transparent)_32%,color-mix(in_srgb,var(--site-hero-bg)_50%,transparent)_50%,transparent_68%)]" />
                        {photo.includes('/shared/stock/') && <StockImageLabel className="bottom-auto right-3 top-3" />}
                    </>
                ) : (
                    <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                        <span className={cn(serif, 'absolute right-[8%] top-1/2 -translate-y-1/2 text-[260px] font-semibold italic leading-[0.7] text-[color-mix(in_srgb,var(--site-mustard)_22%,transparent)] md:text-[520px]')}>“</span>
                        <span className="absolute -right-40 top-1/2 h-[700px] w-[700px] -translate-y-1/2 rounded-full border border-[rgba(251,244,232,0.12)]" />
                        <span className="absolute -right-10 top-1/2 h-[460px] w-[460px] -translate-y-1/2 rounded-full border border-[var(--site-accent-line)]" />
                    </span>
                )}
                {edit && !c.aboutHeroUrl && (
                    <span className="absolute right-6 top-6 whitespace-nowrap rounded-full border border-dashed border-[var(--site-border-strong)] bg-[var(--site-card)] px-4 py-2 font-[family-name:'DM_Sans',system-ui,sans-serif] text-[15px] font-semibold">
                        + Hakkımızda kapağı seç
                    </span>
                )}
            </EditableBlock>
            <div className="pointer-events-none relative z-[1] flex max-w-[760px] flex-col justify-end gap-[22px] px-5 py-10 sm:px-10 md:px-14 md:py-16 [--site-accent-text:var(--site-mustard-text)] [&_[data-edit-text]]:pointer-events-auto">
                <span className={cn('inline-flex items-center gap-2.5', darkLabel)}>
                    <span aria-hidden="true" className="h-0.5 w-7 shrink-0 bg-[var(--site-mustard-text)]" />Hikâyemiz
                </span>
                {edit ? (
                    <EditableText as="h1" id="hk-baslik" field="storyTitle" value={c.storyTitle} fallback={[main, accent].filter(Boolean).join(' ')} placeholder="Slogan yazın"
                        className={cn(serif, 'm-0 break-words text-[52px] leading-[0.92] tracking-[-0.015em] md:text-[clamp(60px,7vw,112px)]')} />
                ) : (
                    <h1 id="hk-baslik" className={cn(serif, 'm-0 break-words text-[52px] leading-[0.92] tracking-[-0.015em] md:text-[clamp(60px,7vw,112px)]')}>
                        {main && <>{main}<br /></>}<em className="rb-accent italic">{accent}</em>
                    </h1>
                )}
                {(c.tagline || showEmpty) && (
                    <EditableText as="p" field="tagline" value={c.tagline} placeholder="Kısa giriş yazın"
                        className="m-0 max-w-[520px] text-base leading-[1.65] text-[rgba(251,244,232,0.9)] md:text-lg" />
                )}
            </div>
        </section>
    );
}

// ── 2. Hikâye kâğıdı ─────────────────────────────────────────────────────────────────────────────

function StoryPaper({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const showEmpty = Boolean(edit?.showEmpty);
    const c = site.site;
    const name = restaurantName(site);
    const since = c.foundedYear ? sinceYear(c.foundedYear) : null;
    const hasStory = Boolean(c.about) || showEmpty;
    const hasQuote = Boolean(c.founderQuote) || showEmpty;
    const facts = stats(site);
    const place = [[site.district, site.openAddress].filter(Boolean).join(', '), hoursLine(site)].filter(Boolean).join('. ');
    const statCols = ({ 1: 'md:grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4' } as Record<number, string>)[facts.length];

    return (
        <section aria-labelledby="hk-hikaye" className={cn(box, 'px-5 py-12 sm:px-10 md:px-[72px] md:py-20')}>
            <div className="mx-auto flex max-w-[1120px] flex-wrap gap-x-20 gap-y-8 md:gap-y-12">
                <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-3.5 md:max-w-[320px]">
                    <EditableBlock target="year" label="Kuruluş yılı" className="self-start rounded-full">
                        <span className={label}>{since ? `Hikâyemiz · ${since}` : 'Hikâyemiz'}</span>
                    </EditableBlock>
                    <h2 id="hk-hikaye" className={cn(serif, 'm-0 break-words text-[40px] italic leading-[1.02] md:text-[44px]')}>
                        {hasStory ? name : <>Bizi <span className="italic">menümüzden</span> tanıyın.</>}
                    </h2>
                </div>
                <div className="flex min-w-0 flex-[999_1_480px] flex-col gap-5 text-base leading-[1.8] text-[#4A3A2C] md:text-lg">
                    {hasStory ? (
                        <EditableText as="p" field="about" value={c.about} multiline placeholder="Hikâyenizi yazın: nasıl başladınız, neyi farklı yapıyorsunuz."
                            className={cn('m-0 whitespace-pre-line',
                                c.about && "first-letter:float-left first-letter:pr-3 first-letter:pt-1.5 first-letter:font-[family-name:Fraunces,Georgia,serif] first-letter:font-bold first-letter:text-[80px] first-letter:leading-[0.78] first-letter:text-[var(--site-accent-text)] md:first-letter:text-[96px]")} />
                    ) : (
                        <>
                            {place && <p className="m-0">{place}.</p>}
                            <Link to="/menu" className="inline-flex h-12 items-center self-start rounded-full bg-[var(--site-paper)] px-6 text-[15px] font-extrabold text-[var(--site-on-paper)] no-underline">Menüyü gör</Link>
                        </>
                    )}
                </div>
            </div>

            {hasQuote && (
                <figure className="mx-auto mb-0 mt-12 flex max-w-[1120px] flex-col gap-[18px] rounded-[24px] bg-[var(--site-mustard)] px-6 py-10 text-center text-[var(--site-text)] [--site-accent-text:var(--site-story)] md:mt-[72px] md:rounded-[28px] md:px-12 md:py-14">
                    <blockquote className={cn(serif, 'm-0 break-words text-[32px] leading-[1.1] md:text-[clamp(36px,4vw,58px)]')}>
                        {edit ? (
                            <EditableText field="founderQuote" value={c.founderQuote} multiline placeholder="Ustanın tek cümlelik sözü" />
                        ) : <QuoteText text={c.founderQuote} />}
                    </blockquote>
                    {(c.founderName || c.founderTitle || edit) && (
                        <figcaption className="flex flex-wrap justify-center gap-x-1.5 text-[15px] font-bold">
                            —{' '}
                            {edit ? (
                                <>
                                    <EditableText field="founderName" value={c.founderName} placeholder="Ustanın adı" />,
                                    <EditableText field="founderTitle" value={c.founderTitle} placeholder="Unvanı" />
                                </>
                            ) : [c.founderName, c.founderTitle].filter(Boolean).join(', ')}
                        </figcaption>
                    )}
                </figure>
            )}

            {facts.length > 0 && (
                <dl className={cn('mx-auto mb-0 grid max-w-[1120px]', facts.length === 1 ? 'grid-cols-1' : 'grid-cols-2', statCols, !hasQuote && 'mt-12 border-t border-[var(--site-border)]')}>
                    {facts.map(f => {
                        const cell = (
                            <div className="flex h-full flex-col items-center gap-2 px-3 pb-2 pt-8 text-center md:px-7 md:pt-10">
                                <dt className="order-2 text-sm text-[var(--site-muted)]">{f.label}</dt>
                                <dd className={cn(serif, 'order-1 m-0 text-[52px] font-semibold leading-none md:text-[64px]')}>{f.value}</dd>
                            </div>
                        );
                        return (
                            <div key={f.key} className="min-w-0 border-[var(--site-border)] even:border-l odd:last:col-span-2 md:border-l md:odd:last:col-span-1 md:first:border-l-0">
                                {f.wrap ? f.wrap(cell) : cell}
                            </div>
                        );
                    })}
                </dl>
            )}
        </section>
    );
}

/** Alıntı: tırnak içinde, virgülden sonrası italik vurgu (virgül yoksa son kelime). */
function QuoteText({ text }: { text: string }) {
    const [main, accent] = splitAccent(text);
    return <>“{main && <>{main} </>}<em className="rb-accent italic">{accent}</em>”</>;
}

// ── 3. Usta + değerler ───────────────────────────────────────────────────────────────────────────

function FounderAndValues({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const showEmpty = Boolean(edit?.showEmpty);
    const c = site.site;
    const showFounder = Boolean(c.founderName) || showEmpty;
    const showValues = c.values.length > 0 || showEmpty;
    if (!showFounder && !showValues) return null;
    const photoT = editTarget(edit, 'photo:founder', 'Usta portresi');
    return (
        <div className="flex flex-wrap gap-4">
            {showFounder && (
                <section aria-labelledby="hk-usta"
                    className="relative flex min-h-[420px] min-w-0 flex-[1_1_460px] flex-col justify-end gap-4 overflow-hidden rounded-[24px] bg-[var(--site-menu-box)] p-6 text-[var(--site-on-paper)] sm:p-10 md:min-h-[520px] md:rounded-[32px] [--site-accent-text:var(--site-mustard-text)]">
                    {c.founderPhotoUrl ? (
                        <>
                            <img src={c.founderPhotoUrl} alt={c.founderName} {...photoT} className={cn('absolute inset-0 h-full w-full object-cover', photoT.className)} />
                            <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(36,24,15,0)_30%,color-mix(in_srgb,var(--site-menu-box)_94%,transparent)_85%)]" />
                        </>
                    ) : edit ? (
                        <div className="absolute left-6 top-6 w-[180px] sm:left-10 sm:top-10"><EmptySlot target="photo:founder" title="+ Portre ekle" className="bg-[var(--site-card)]" /></div>
                    ) : c.founderName && (
                        <span aria-hidden="true" className={cn(serif, 'absolute left-6 top-6 flex h-[120px] w-[120px] items-center justify-center rounded-full border border-[rgba(246,241,233,0.25)] text-[56px] font-semibold text-[var(--site-mustard-text)] sm:left-10 sm:top-10 sm:h-[150px] sm:w-[150px] sm:text-[64px]')}>
                            {initials(c.founderName)}
                        </span>
                    )}
                    <span className={cn(darkLabel, 'relative')}>Mutfağın başında</span>
                    <EditableText as="h2" id="hk-usta" field="founderName" value={c.founderName} placeholder="Ustanın adı"
                        className={cn(serif, 'relative m-0 break-words text-[44px] leading-none md:text-[52px]')} />
                    {(c.founderTitle || showEmpty) && (
                        <EditableText as="p" field="founderTitle" value={c.founderTitle} placeholder="Unvanı"
                            className="relative m-0 max-w-[440px] text-base leading-[1.7] text-[#E3D8C8]" />
                    )}
                </section>
            )}
            {showValues && (
                <section aria-labelledby="hk-degerler" className={cn(box, 'flex min-w-0 flex-[1_1_560px] flex-col gap-2 p-6 sm:p-10')}>
                    <h2 id="hk-degerler" className={cn(label, 'm-0')}>Değişmeyenlerimiz</h2>
                    <ol className="m-0 flex list-none flex-col p-0">
                        {c.values.map((v, i) => (
                            <li key={i}>
                                <ListCard list="values" index={i} count={c.values.length} label="Değer" className="rounded-none">
                                    <div className="flex items-start gap-4 border-b border-[var(--site-line)] py-[22px] sm:gap-[22px]">
                                        <span aria-hidden="true" className={cn(serif, 'w-11 shrink-0 text-[36px] italic leading-none text-[var(--site-accent-text)] sm:w-[52px] sm:text-[40px]')}>{String(i + 1).padStart(2, '0')}</span>
                                        <div className="flex min-w-0 flex-col gap-1.5">
                                            <EditableText as="h3" field={`value:${i}:title`} value={v.title} placeholder="Başlık"
                                                className={cn(serif, 'm-0 break-words text-[28px] font-semibold leading-[1.05] md:text-[32px]')} />
                                            {(v.text || edit) && (
                                                <EditableText as="p" field={`value:${i}:text`} value={v.text} placeholder="Tek cümle"
                                                    className="m-0 text-[15px] leading-[1.65] text-[var(--site-sub)]" />
                                            )}
                                        </div>
                                    </div>
                                </ListCard>
                            </li>
                        ))}
                    </ol>
                    <AddCard list="values" label="Değer ekle" count={c.values.length} max={SITE_LIMITS.value.max} className="mt-3" />
                </section>
            )}
        </div>
    );
}

// ── 4. Yolculuk ──────────────────────────────────────────────────────────────────────────────────

function Journey({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const showEmpty = Boolean(edit?.showEmpty);
    const milestones = site.site.milestones;
    // Sitede en az 2 durak olunca görünür; düzenleyicide eklenebilsin diye boşken de.
    if (!(milestones.length >= 2 || (edit && (milestones.length > 0 || showEmpty)))) return null;
    return (
        <section aria-labelledby="hk-yol" className={cn(box, 'px-5 py-10 sm:px-10 md:px-[72px] md:py-14')}>
            <div className="mb-8 flex flex-wrap items-baseline justify-between gap-3 md:mb-10">
                <h2 id="hk-yol" className={cn(serif, 'm-0 text-[44px] leading-none md:text-[52px]')}>Yolculuğumuz</h2>
                {edit && milestones.length < 2 && (
                    <span className="font-[family-name:'DM_Sans',system-ui,sans-serif] text-sm text-[#7A4E0E]">En az 2 olunca görünür.</span>
                )}
            </div>
            <ol className="m-0 grid list-none grid-cols-1 gap-8 p-0 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(220px,1fr))] lg:gap-0">
                {milestones.map((m, i) => (
                    <li key={i} className="min-w-0">
                        <ListCard list="milestones" index={i} count={milestones.length} label="Kilometre taşı" className="h-full rounded-none">
                            <div className="flex h-full flex-col gap-3.5 lg:pr-7">
                                <div aria-hidden="true" className="flex items-center">
                                    <span className={cn('h-3.5 w-3.5 shrink-0 rounded-full shadow-[0_0_0_5px_var(--site-accent-soft)]',
                                        i === milestones.length - 1 ? 'bg-[var(--site-accent)]' : 'bg-[var(--site-paper)]')} />
                                    <span className="h-px flex-1 bg-[rgba(36,24,15,0.18)]" />
                                </div>
                                <EditableText field={`milestone:${i}:year`} value={m.year ? String(m.year) : ''} placeholder="Yıl"
                                    className={cn(serif, 'text-[40px] leading-none tabular-nums')} />
                                <EditableText as="p" field={`milestone:${i}:text`} value={m.text} placeholder="Ne oldu?"
                                    className="m-0 text-[15px] leading-relaxed text-[var(--site-sub)]" />
                            </div>
                        </ListCard>
                    </li>
                ))}
                {edit && milestones.length < SITE_LIMITS.milestone.max && (
                    <li><AddCard list="milestones" label="Kilometre taşı ekle" count={milestones.length} max={SITE_LIMITS.milestone.max} /></li>
                )}
            </ol>
        </section>
    );
}

// ── 5. Davet ─────────────────────────────────────────────────────────────────────────────────────

function Invitation({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    if (edit) return null;
    const canReserve = canReserveOnline(site);
    return (
        <ExternalHint source="reservation">
            <section aria-labelledby="hk-davet"
                className="flex flex-wrap items-center justify-between gap-6 rounded-[24px] bg-[var(--site-story)] p-6 text-[var(--site-on-paper)] sm:p-10 md:rounded-[32px] md:p-14 [--site-accent-text:var(--site-mustard-text)]">
                <h2 id="hk-davet" className={cn(serif, 'm-0 text-[40px] leading-[0.95] md:text-[clamp(42px,4.6vw,68px)]')}>
                    Hikâyemizin bir parçası olun,<br /><em className="italic">bir akşam bekleriz.</em>
                </h2>
                <div className="flex flex-wrap gap-2.5">
                    {canReserve && <Link to={RESERVATION_PATH} className="inline-flex h-14 items-center rounded-full bg-[var(--site-mustard)] px-7 font-extrabold text-[var(--site-text)] no-underline transition-opacity hover:opacity-90">Masa ayırt</Link>}
                    <Link to="/menu" className="inline-flex h-14 items-center rounded-full bg-[var(--site-card)] px-7 font-extrabold text-[var(--site-text)] no-underline transition-opacity hover:opacity-90">Menüyü gör</Link>
                </div>
            </section>
        </ExternalHint>
    );
}
