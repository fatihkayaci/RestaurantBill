import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { canReserveOnline, type PublicSite, type PublicTable } from '@/features/customerSite/types';
import { cn } from '@/lib/utils';
import { StockImageLabel } from './components/StockImageLabel';
import { SiteShell, SiteStatus } from './site/SiteChrome';
import { PageEmpty, SitePage } from './site/SiteFrame';
import { DirectionsIcon, PhoneIcon, WhatsAppIcon } from './site/SiteCards';
import { AmenityIcon, MapPanel, TablePlan, VenueGallery, WayIcon } from './site/VenueParts';
import { RESERVATION_PATH, SITE_AMENITIES, hasVenuePage, serif } from './site/siteParts';
import { directionsUrl, splitAccent, telHref, whatsappHref } from './site/siteTheme';
import { fullAddress, hoursLine, restaurantName, useSite } from './site/useSite';
import { EditableBlock, EditableText, EmptySlot, ExternalHint } from './site/siteEdit';
import { editTarget, useSiteEdit } from './site/siteEditContext';
import { oliveBg, terracottaBg } from './site/renkliTones';

// /mekan (tasarım: "Renkli ve sıcak — Mekân"). Kum sayfada krem, yuvarlak köşeli kutular: (1) zeytin kapak, krem yazı,
// hardal üst satır ve italik: mekân fotoğrafı soldan zeytin geçişle (yoksa sağda krem çizgili, hardal noktalı masa planı), "Mekân", dev serif başlık, kısa tarif, "Masa ayırt" ve
// "Nasıl gelinir?" düğmeleri. (2) "Nerede oturmak istersiniz?": Masalar'daki bölümler sütun sütun (fotoğraf, kişi ya
// da masa sayısı, açıklama). (3) Galeri: büyük kare + küçük kareler. (4) Olanaklar (ikonlu) + kiremit
// "Özel günler" (koyu WhatsApp, hardal telefon). (5) "Nasıl gelinir?": süs harita, adres, ulaşım notu, otopark, saatler ve
// yol tarifi. Fotoğraflı ya da fotoğrafsız görünüm veriden kendiliğinden seçilir; girilmemiş bilgi gösterilmez.

const box = 'rounded-[24px] bg-[var(--site-card)] text-[var(--site-text)] md:rounded-[32px]';
const LOCATION_ID = 'konum';

/** Mekân fotoğrafları: galeri → hikâye → kapak (tekrarsız). */
function venuePhotos(site: PublicSite): string[] {
    const c = site.site;
    return [...new Set([...c.galleryImageUrls, c.aboutImageUrl, c.coverImageUrl].filter(Boolean))];
}

/** Kapak: Mekân'ın kendi kapağı → galerinin ilk fotoğrafı → hikâye → sitenin kapağı. */
function heroPhoto(site: PublicSite): string {
    const c = site.site;
    return c.venueHeroUrl || c.galleryImageUrls[0] || c.aboutImageUrl || c.coverImageUrl;
}

/** Türkçe bulunma eki: "salon" → "salonda", "teras" → "terasta", "bahçe" → "bahçede" (son ünlü ve sert ünsüz uyumu). */
function locative(word: string): string {
    const lower = word.trim().toLocaleLowerCase('tr-TR');
    const vowel = [...lower].reverse().find(ch => 'aıoueiöü'.includes(ch));
    const a = vowel && 'eiöü'.includes(vowel) ? 'e' : 'a';
    const d = 'fstkçşhp'.includes(lower.slice(-1)) ? 't' : 'd';
    return `${lower}${d}${a}`;
}

/** "Salonda, avluda" + "ya da terasta." (en çok üç bölüm); tek bölümde null. */
function regionPhrase(names: string[]): [string, string] | null {
    if (names.length < 2) return null;
    const locs = names.slice(0, 3).map(locative);
    const head = locs.slice(0, -1).join(', ');
    return [head.charAt(0).toLocaleUpperCase('tr-TR') + head.slice(1), `ya da ${locs[locs.length - 1]}.`];
}

/** Masaların toplam kişi sayısı; yalnız her masanın kapasitesi girildiyse (yoksa null, uydurulmaz). */
function seatCount(tables: PublicTable[]): number | null {
    if (tables.length === 0 || !tables.every(t => t.capacity && t.capacity > 0)) return null;
    return tables.reduce((sum, t) => sum + (t.capacity ?? 0), 0);
}

export default function RestaurantVenuePage() {
    const { site, error } = useSite();
    const edit = useSiteEdit();
    if (!site) return <SiteShell><SiteStatus error={error} /></SiteShell>;

    const showEmpty = Boolean(edit?.showEmpty);

    if (!hasVenuePage(site) && !showEmpty) {
        return (
            <SitePage site={site} current="mekan">
                <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-4 px-2 pb-4 pt-4 sm:px-4">
                    <VenueHero site={site} hasLocation={false} />
                    <div className={box}><PageEmpty text="Mekân bilgileri henüz eklenmedi." /></div>
                </main>
            </SitePage>
        );
    }

    const hasLocation = Boolean(fullAddress(site) || site.site.directionsNote);

    return (
        <SitePage site={site} current="mekan" lastCall={false}>
            <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-4 px-2 pb-4 pt-4 sm:px-4">
                <VenueHero site={site} hasLocation={hasLocation} />
                <Areas site={site} />
                <Gallery site={site} />
                <AmenitiesRow site={site} />
                <Location site={site} />
            </main>
        </SitePage>
    );
}

// ── 1. Kapak ─────────────────────────────────────────────────────────────────────────────────────

function VenueHero({ site, hasLocation }: { site: PublicSite; hasLocation: boolean }) {
    const edit = useSiteEdit();
    const showEmpty = Boolean(edit?.showEmpty);
    const c = site.site;
    const photo = heroPhoto(site);
    const canReserve = canReserveOnline(site);
    // Başlık: restoranın yazdığı büyük başlık; yoksa bölümlerden ("Salonda, terasta / ya da bahçede."), o da yoksa ad.
    const [main, accent] = c.headline ? splitAccent(c.headline) : regionPhrase(site.regions.map(r => r.name)) ?? splitAccent(restaurantName(site));
    const titleClass = cn(serif, 'm-0 break-words text-[52px] leading-[0.92] tracking-[-0.015em] md:text-[clamp(60px,7vw,108px)]');
    const actionClass = 'inline-flex h-[54px] flex-1 items-center justify-center whitespace-nowrap rounded-full px-7 text-base no-underline transition-opacity hover:opacity-90 sm:flex-none';

    return (
        <section aria-labelledby="mk-baslik"
            className={cn(box, oliveBg, 'relative flex min-h-[460px] overflow-hidden text-[var(--site-on-paper)] md:min-h-[540px] [--site-accent-text:var(--site-mustard-text)]')}>
            <EditableBlock target="photo:hero-mekan" label="Mekân kapağı" chip="Fotoğrafı değiştir" className="absolute inset-0">
                {photo ? (
                    <>
                        <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover object-[60%_40%]" />
                        {/* Telefonda yazının arkası aşağı doğru koyulaşan zeytin perde; geniş ekranda soldan zeytin geçiş. */}
                        <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(62,74,51,0.6)_0%,rgba(62,74,51,0.9)_50%,rgba(62,74,51,0.97)_100%)] md:bg-[linear-gradient(90deg,rgba(62,74,51,0.97)_0%,rgba(62,74,51,0.88)_30%,rgba(62,74,51,0.45)_48%,rgba(62,74,51,0)_64%)]" />
                        {photo.includes('/shared/stock/') && <StockImageLabel className="bottom-auto right-3 top-3" />}
                    </>
                ) : (
                    <TablePlan className="absolute right-14 top-1/2 hidden -translate-y-1/2 lg:grid" />
                )}
                {edit && !c.venueHeroUrl && (
                    <span className="absolute right-6 top-6 whitespace-nowrap rounded-full border border-dashed border-[var(--site-border-strong)] bg-[var(--site-card)] px-4 py-2 font-[family-name:'DM_Sans',system-ui,sans-serif] text-[15px] font-semibold text-[var(--site-text)]">
                        + Mekân kapağı seç
                    </span>
                )}
            </EditableBlock>
            <div className="pointer-events-none relative z-[1] flex max-w-[720px] flex-col justify-end gap-[22px] px-5 py-10 sm:px-10 md:px-14 md:py-16 [&_[data-edit-text]]:pointer-events-auto [&_a]:pointer-events-auto">
                <span className="inline-flex items-center gap-2.5 text-xs font-extrabold uppercase tracking-[0.24em] text-[var(--site-mustard-text)]">
                    <span aria-hidden="true" className="h-0.5 w-7 shrink-0 bg-[var(--site-mustard-text)]" />Mekân
                </span>
                {edit ? (
                    <EditableText as="h1" id="mk-baslik" field="headline" value={c.headline} fallback={[main, accent].filter(Boolean).join(' ')}
                        placeholder="Büyük başlık" className={titleClass} />
                ) : (
                    <h1 id="mk-baslik" className={titleClass}>
                        {main && <>{main}<br /></>}<em className="rb-accent italic">{accent}</em>
                    </h1>
                )}
                {(c.tagline || showEmpty) && (
                    <EditableText as="p" field="tagline" value={c.tagline} placeholder="Alt başlık"
                        className="m-0 max-w-[500px] text-base leading-[1.65] text-[rgba(251,244,232,0.88)] md:text-lg" />
                )}
                {!edit && (canReserve || hasLocation) && (
                    <div className="flex flex-wrap gap-2.5">
                        {canReserve && <Link to={RESERVATION_PATH} className={cn(actionClass, 'bg-[var(--site-mustard)] font-extrabold text-[var(--site-text)]')}>Masa ayırt</Link>}
                        {hasLocation && (
                            <a href={`#${LOCATION_ID}`} className={cn(actionClass, 'border-2 border-[rgba(251,244,232,0.5)] font-bold text-[var(--site-on-paper)] hover:border-[var(--site-on-paper)]')}>Nasıl gelinir?</a>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}

// ── 2. Oturma bölümleri ──────────────────────────────────────────────────────────────────────────

function Areas({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const showEmpty = Boolean(edit?.showEmpty);
    const regions = site.regions;
    if (regions.length === 0) return null;
    const total = seatCount(regions.flatMap(r => r.tables));
    // En çok üç bölüm yan yana, aralarında ince çizgi; daha fazlası satır satır (üstte çizgi). Telefonda hep satır.
    const inRow = regions.length <= 3;
    const cols = ({ 1: 'md:grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3' } as Record<number, string>)[regions.length] ?? 'md:grid-cols-2 lg:grid-cols-3';

    return (
        // Düzenleyicide bölümün adı yalnız tanımak için yazılır (Masalar'dan gelir); kişi / masa sayısı yok.
        <section aria-labelledby="mk-alanlar" data-edit-reveal={edit ? 'list:regions' : undefined} className={cn(box, 'px-5 py-9 sm:px-10 md:p-14')}>
            <div className="mb-7 flex flex-wrap items-baseline justify-between gap-3 md:mb-9">
                <h2 id="mk-alanlar" className={cn(serif, 'm-0 text-[40px] leading-none md:text-[54px]')}>Nerede <em className="rb-accent italic">oturmak</em> istersiniz?</h2>
                {total !== null && !edit && <span className="text-sm text-[var(--site-muted)]">Toplam {total} kişilik</span>}
            </div>
            <div className={cn('grid grid-cols-1', cols, !inRow && 'md:gap-x-8')}>
                {regions.map((region, i) => {
                    const t = editTarget(edit, `region:${region.id}`, `Bölüm · ${region.name}`);
                    const seats = seatCount(region.tables);
                    const count = seats !== null ? `${seats} kişi` : region.tables.length > 0 ? `${region.tables.length} masa` : null;
                    return (
                        <article key={region.id} {...t}
                            className={cn('flex min-w-0 flex-col gap-3 border-[var(--site-line)] py-6 first:pt-0 last:pb-0',
                                i > 0 && 'border-t',
                                inRow ? 'md:border-t-0 md:px-8 md:py-0 md:first:pl-0 md:last:pr-0' : 'md:border-t md:pt-6 md:[&:nth-child(-n+2)]:border-t-0 md:[&:nth-child(-n+2)]:pt-0 lg:[&:nth-child(3)]:border-t-0 lg:[&:nth-child(3)]:pt-0',
                                inRow && i > 0 && 'md:border-l', t.className)}>
                            {region.photoUrl && <img src={region.photoUrl} alt={region.name} loading="lazy" className="mb-1.5 block h-[200px] w-full rounded-[20px] object-cover md:h-[220px]" />}
                            {!region.photoUrl && showEmpty && (
                                <div className="mb-1.5 flex h-[200px] items-center justify-center rounded-[20px] border border-dashed border-[#CFC5B4] font-[family-name:'DM_Sans',system-ui,sans-serif] text-[15px] font-semibold text-[#8A7D6E] md:h-[220px]">
                                    + Fotoğraf ekle
                                </div>
                            )}
                            <div className="flex items-baseline justify-between gap-3">
                                <h3 className={cn(serif, 'm-0 min-w-0 break-words text-[32px] font-semibold leading-none md:text-[36px]')}>{region.name}</h3>
                                {count && !edit && <span className={cn(serif, 'shrink-0 text-2xl font-semibold italic text-[var(--site-accent-text)]')}>{count}</span>}
                            </div>
                            {(region.description || showEmpty) && (
                                <EditableText as="p" field={`region:${region.id}`} value={region.description ?? ''} placeholder="Kısa açıklama"
                                    className="m-0 text-[15px] leading-[1.65] text-[var(--site-sub)]" />
                            )}
                        </article>
                    );
                })}
            </div>
        </section>
    );
}

// ── 3. Galeri ────────────────────────────────────────────────────────────────────────────────────

function Gallery({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const photos = venuePhotos(site);
    if (edit) {
        // Düzenleyicide bütün mekân fotoğrafları (kapakla aynı olan da) tıklanabilir kalır.
        return photos.length > 0 ? <VenueGallery site={site} photos={photos} title={restaurantName(site)} /> : <EmptySlot target="gallery:add" title="+ Fotoğraf ekle" />;
    }
    // Yalnız mekân fotoğrafı varsa; kapakta görünen fotoğraf galeride tekrarlanmaz.
    const hero = heroPhoto(site);
    const shown = photos.filter(p => p !== hero);
    if (site.site.galleryImageUrls.length === 0 || shown.length === 0) return null;
    return <VenueGallery site={site} photos={shown} title={restaurantName(site)} />;
}

// ── 4. Olanaklar + Özel günler ───────────────────────────────────────────────────────────────────

function AmenitiesRow({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const showEmpty = Boolean(edit?.showEmpty);
    const c = site.site;
    // Admin'deki sırayla, yalnız seçili olanlar.
    const amenities = SITE_AMENITIES.filter(a => c.amenities.includes(a.key));
    const amenT = editTarget(edit, 'amenities', 'Olanaklar');
    const whatsapp = c.whatsappPhone;
    const phone = site.phone;
    const showSpecial = edit ? Boolean(whatsapp) : Boolean(whatsapp || phone);
    const maxParty = canReserveOnline(site) && site.reservation.maxPartySize > 0 ? site.reservation.maxPartySize : null;
    const waT = editTarget(edit, 'contact', 'WhatsApp');
    const bigButton = 'flex h-[54px] items-center justify-center gap-2 rounded-full px-5 text-base font-extrabold no-underline transition-opacity hover:opacity-90 [&>svg]:h-[18px] [&>svg]:w-[18px]';

    if (amenities.length === 0 && !showSpecial && !showEmpty) return null;

    return (
        <div className="flex flex-wrap gap-4">
            {amenities.length > 0 ? (
                <section aria-labelledby="mk-olanak" {...amenT} className={cn(box, 'min-w-0 flex-[999_1_640px] px-5 py-9 sm:p-10 md:p-12', amenT.className)}>
                    <h2 id="mk-olanak" className={cn(serif, 'm-0 mb-6 text-[40px] leading-none md:mb-7 md:text-[46px]')}>Olanaklar</h2>
                    <ul className="m-0 grid list-none grid-cols-2 gap-2.5 p-0 sm:grid-cols-[repeat(auto-fill,minmax(190px,1fr))]">
                        {amenities.map(a => (
                            <li key={a.key} className="flex min-w-0 flex-col gap-2.5 rounded-[22px] bg-[var(--site-bg)] p-4 sm:p-5">
                                <AmenityIcon amenity={a.key} />
                                <span className="break-words text-[15px] font-bold leading-snug">{a.label}</span>
                            </li>
                        ))}
                    </ul>
                </section>
            ) : showEmpty && (
                <div className="min-w-0 flex-[999_1_640px]"><EmptySlot target="amenities" title="+ Olanak ekle" className="min-h-[160px]" /></div>
            )}
            {showSpecial ? (
                <section aria-labelledby="mk-ozel"
                    className={cn(box, terracottaBg, 'flex min-w-0 flex-[1_1_360px] flex-col justify-between gap-7 px-5 py-9 text-[var(--site-on-paper)] [--site-accent-text:currentColor] sm:p-10 md:p-11')}>
                    <div className="flex flex-col gap-3.5">
                        {/* Hardal yazı kiremitte 3.7:1 kalıyor: etiket krem, hardal yalnız yanındaki çizgide. */}
                        <span className="inline-flex items-center gap-2.5 text-xs font-extrabold uppercase tracking-[0.24em]">
                            <span aria-hidden="true" className="h-0.5 w-7 shrink-0 bg-[var(--site-mustard)]" />Özel günler
                        </span>
                        <h2 id="mk-ozel" className={cn(serif, 'm-0 text-[40px] leading-none md:text-[46px]')}>Doğum günü, nişan, iş yemeği…</h2>
                        <p className="m-0 text-base leading-[1.65]">
                            {maxParty ? `Online rezervasyon ${maxParty} kişiye kadar; daha kalabalık gruplar ve özel günler için bize yazın ya da arayın.` : 'Kalabalık gruplar ve özel günler için bize yazın ya da arayın.'}
                        </p>
                    </div>
                    <div className="flex flex-col gap-2">
                        {whatsapp && (
                            <a href={whatsappHref(whatsapp)} target="_blank" rel="noopener noreferrer" {...waT}
                                className={cn(bigButton, 'bg-[var(--site-paper)] text-[var(--site-on-paper)]', waT.className)}>
                                <WhatsAppIcon />WhatsApp'tan yazın
                            </a>
                        )}
                        {phone && (
                            <ExternalHint source="restaurant">
                                <a href={telHref(phone)} aria-label={`Telefonla arayın: ${phone}`} className={cn(bigButton, 'bg-[var(--site-mustard)] text-[var(--site-text)]')}>
                                    <PhoneIcon />{phone}
                                </a>
                            </ExternalHint>
                        )}
                    </div>
                </section>
            ) : showEmpty && (
                <div className="min-w-0 flex-[1_1_360px]"><EmptySlot target="contact" title="+ WhatsApp numarası ekle" className="min-h-[160px]" /></div>
            )}
        </div>
    );
}

// ── 5. Nasıl gelinir? ────────────────────────────────────────────────────────────────────────────

function Way({ icon, title, children }: { icon: Parameters<typeof WayIcon>[0]['kind']; title: string; children: ReactNode }) {
    return (
        <div className="flex gap-4">
            <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-[var(--site-bg)]">
                <WayIcon kind={icon} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--site-muted)]">{title}</span>
                {children}
            </div>
        </div>
    );
}

function Location({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const showEmpty = Boolean(edit?.showEmpty);
    const c = site.site;
    const name = restaurantName(site);
    // Adres Ayarlar'dan gelir: düzenleyicide (harita, adres ve yol tarifi düğmesiyle) çizilmez.
    const address = edit ? '' : fullAddress(site);
    const hours = hoursLine(site);
    const parking = [c.amenities.includes('otopark') && 'otopark', c.amenities.includes('vale') && 'vale hizmeti'].filter(Boolean).join(' ve ');
    const showParking = Boolean(parking) && !edit;
    const showNote = Boolean(c.directionsNote) || showEmpty;
    // Kutu yalnız adres ya da yol notu varsa (sayfanın asıl bilgisi); saat ve otopark tek başına kutu açmaz.
    if (!(address || showNote || (edit && hours))) return null;
    const text = 'text-base leading-normal';

    return (
        <section id={LOCATION_ID} aria-labelledby="mk-yol" className={cn(box, 'flex scroll-mt-24 flex-wrap overflow-hidden')}>
            {address && <MapPanel name={name} className="min-h-[260px] min-w-0 flex-[999_1_600px] md:min-h-[460px]" />}
            <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-6 px-5 py-9 sm:p-10 md:gap-[26px] md:p-12">
                <h2 id="mk-yol" className={cn(serif, 'm-0 text-[40px] leading-none md:text-[46px]')}>Nasıl <em className="rb-accent italic">gelinir?</em></h2>
                {address && <Way icon="address" title="Adres"><span className={cn(text, 'break-words')}>{address}</span></Way>}
                {showNote && (
                    <Way icon="route" title="Ulaşım">
                        <EditableText as="p" field="directionsNote" value={c.directionsNote} multiline placeholder="Nasıl gelinir? (durak, hat, yürüme mesafesi)"
                            className={cn(text, 'm-0 whitespace-pre-line break-words')} />
                    </Way>
                )}
                {showParking && <Way icon="parking" title="Otopark"><span className={text}>{parking.charAt(0).toLocaleUpperCase('tr-TR') + parking.slice(1)} var</span></Way>}
                {hours ? (
                    <EditableBlock target="hours" label="Çalışma saatleri" className="rounded-[20px]">
                        <Way icon="clock" title="Çalışma saatleri"><span className={text}>{hours}{c.hoursNote && <span className="block text-sm text-[var(--site-sub)]">{c.hoursNote}</span>}</span></Way>
                    </EditableBlock>
                ) : <EmptySlot target="hours" title="+ Saat ekle" />}
                {address && (
                    <a href={directionsUrl(address)} target="_blank" rel="noopener noreferrer"
                        className="mt-auto flex h-14 items-center justify-center gap-2 rounded-full bg-[var(--site-paper)] text-base font-extrabold text-[var(--site-on-paper)] no-underline transition-opacity hover:opacity-90">
                        <DirectionsIcon className="h-[18px] w-[18px]" />Yol tarifi al
                    </a>
                )}
            </div>
        </section>
    );
}
