import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { canReserveOnline, type PublicSite } from '@/features/customerSite/types';
import { cn } from '@/lib/utils';
import { SitePage } from '../SiteFrame';
import { RESERVATION_PATH, SITE_AMENITIES, hasVenuePage, instagramHandle } from '../siteParts';
import { directionsUrl, splitAccent, telHref, whatsappHref } from '../siteTheme';
import { fullAddress, hoursLine, restaurantName } from '../useSite';
import { EditableBlock, EditableText, EmptySlot, ExternalHint } from '../siteEdit';
import { SITE_LIMITS, editTarget, useSiteEdit } from '../siteEditContext';
import { heroPhoto, photoTarget, regionPhrase, seatCount, venuePhotos } from '../venueData';
import { EliteEmpty, EliteHero, EliteKicker } from './EliteBits';
import { elButton, elItalic, elLabel, elSection, elSerif, elTitle, elWrap, heroLead, onDark } from './eliteParts';
import { StockImageLabel } from '../../components/StockImageLabel';

// /mekan, Elit (tasarım: EliteMekan). (1) Tam genişlik kapak (Mekân kapağı → galeri → hikâye → site kapağı). (2) "Nerede
// oturmak istersiniz?": Masalar'daki bölümler (fotoğraf, kişi ya da masa sayısı, açıklama). (3) Koyu "Olanaklar": yalnız
// seçili olanaklar. (4) Galeri mozaiği + (yalnız "Grup ve özel gün" seçiliyse) "Özel geceler" kutusu. (5) Süs harita ve
// "Nasıl gelinir": adres, ulaşım notu, otopark, saatler, yol tarifi. Girilmemiş bilgi gösterilmez.

const LOCATION_ID = 'konum';
const MOSAIC_SMALL = 3;

export default function EliteVenue({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const showEmpty = Boolean(edit?.showEmpty);
    const empty = !hasVenuePage(site) && !showEmpty;
    const hasLocation = !empty && Boolean(fullAddress(site) || site.site.directionsNote);
    return (
        <SitePage site={site} current="mekan" overlayHeader stickyHeader={false}>
            <main className="flex flex-1 flex-col bg-[var(--site-bg)] text-[var(--site-text)]">
                <VenueHero site={site} hasLocation={hasLocation} />
                {empty ? <EliteEmpty text="Mekân bilgileri henüz eklenmedi." /> : (
                    <>
                        <Areas site={site} />
                        <Amenities site={site} />
                        <GalleryAndEvents site={site} />
                        <Location site={site} />
                    </>
                )}
            </main>
        </SitePage>
    );
}

function VenueHero({ site, hasLocation }: { site: PublicSite; hasLocation: boolean }) {
    const edit = useSiteEdit();
    const showEmpty = Boolean(edit?.showEmpty);
    const c = site.site;
    const canReserve = canReserveOnline(site);
    // Başlık: restoranın büyük başlığı; yoksa bölümlerden ("Salonda, terasta / ya da bahçede."), o da yoksa ad.
    const [main, accent] = c.headline ? splitAccent(c.headline) : regionPhrase(site.regions.map(r => r.name)) ?? splitAccent(restaurantName(site));
    const title = edit
        ? <EditableText field="headline" value={c.headline} fallback={[main, accent].filter(Boolean).join(' ')} placeholder="Büyük başlık" />
        : <>{main && <>{main}<br /></>}<em className="italic">{accent}</em></>;
    const lead = c.tagline || showEmpty
        ? <EditableText as="p" field="tagline" value={c.tagline} placeholder="Alt başlık" className={heroLead} />
        : null;
    return (
        <EliteHero titleId="mk-baslik" label="Mekân" title={title} lead={lead}
            image={heroPhoto(site)} ownImage={Boolean(c.venueHeroUrl)}
            imageTarget="photo:hero-mekan" imageLabel="Mekân kapağı" emptyHint="+ Mekân kapağı seç">
            {!edit && (canReserve || hasLocation) && (
                <div className="mt-2.5 flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:gap-4">
                    {canReserve && <Link to={RESERVATION_PATH} className={elButton.gold}>Rezervasyon</Link>}
                    {hasLocation && <a href={`#${LOCATION_ID}`} className={elButton.ghost}>Nasıl gelinir?</a>}
                </div>
            )}
        </EliteHero>
    );
}

// ── Oturma bölümleri ─────────────────────────────────────────────────────────────────────────────

function Areas({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const showEmpty = Boolean(edit?.showEmpty);
    const regions = site.regions;
    if (regions.length === 0) return null;
    const total = seatCount(regions.flatMap(r => r.tables));
    return (
        // Düzenleyicide bölümün adı yalnız tanımak için yazılır (Masalar'dan gelir); kişi / masa sayısı yok.
        <section aria-labelledby="mk-alanlar" data-edit-reveal={edit ? 'list:regions' : undefined} className="bg-[var(--site-bg)]">
            <div className={cn(elWrap, elSection, 'flex max-w-[1320px] flex-col gap-14 md:gap-16 md:py-[140px]')}>
                <div className="flex flex-wrap items-end justify-between gap-6">
                    <div className="flex flex-col gap-5">
                        <EliteKicker>Alanlar</EliteKicker>
                        <h2 id="mk-alanlar" className={elTitle}>Nerede <em className="italic">oturmak</em> istersiniz?</h2>
                    </div>
                    {total !== null && !edit && <span className="text-xs uppercase tracking-[0.24em] text-[var(--site-muted)]">Toplam {total} kişilik</span>}
                </div>
                <div className="grid grid-cols-1 gap-x-8 gap-y-14 md:grid-cols-[repeat(auto-fit,minmax(320px,1fr))]">
                    {regions.map(region => {
                        const t = editTarget(edit, `region:${region.id}`, `Bölüm · ${region.name}`);
                        const seats = seatCount(region.tables);
                        const count = seats !== null ? `${seats} kişi` : region.tables.length > 0 ? `${region.tables.length} masa` : null;
                        return (
                            <article key={region.id} {...t} className={cn('rb-el-zoom flex min-w-0 flex-col gap-[22px]', t.className)}>
                                {region.photoUrl ? (
                                    <div className="relative h-[300px] overflow-hidden md:h-[440px]">
                                        <img src={region.photoUrl} alt={region.name} loading="lazy" className="h-full w-full object-cover" />
                                        {region.photoUrl.includes('/shared/stock/') && <StockImageLabel className="bottom-auto right-3 top-3" />}
                                    </div>
                                ) : showEmpty && (
                                    <div className="flex h-[300px] items-center justify-center border border-dashed border-[#CFC5B4] font-[family-name:'DM_Sans',system-ui,sans-serif] text-[15px] font-semibold text-[#8A7D6E] md:h-[440px]">+ Fotoğraf ekle</div>
                                )}
                                <div className="flex items-baseline justify-between gap-3 border-b border-[color-mix(in_srgb,var(--site-text)_18%,transparent)] pb-3.5">
                                    <h3 className={cn(elSerif, 'm-0 min-w-0 break-words text-[30px] leading-none md:text-[34px]')}>{region.name}</h3>
                                    {count && !edit && <span className={cn(elItalic, 'shrink-0 text-xl text-[var(--site-accent-text)]')}>{count}</span>}
                                </div>
                                {(region.description || showEmpty) && (
                                    <EditableText as="p" field={`region:${region.id}`} value={region.description ?? ''} placeholder="Kısa açıklama"
                                        className="m-0 text-base leading-[1.8] text-[var(--site-sub)]" />
                                )}
                            </article>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

// ── Olanaklar ────────────────────────────────────────────────────────────────────────────────────

function Amenities({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const showEmpty = Boolean(edit?.showEmpty);
    // Admin'deki sırayla, yalnız seçili olanlar (var/yok yazılmaz: seçili olmayan hiç çizilmez).
    const amenities = SITE_AMENITIES.filter(a => site.site.amenities.includes(a.key));
    const amenT = editTarget(edit, 'amenities', 'Olanaklar');
    if (amenities.length === 0) {
        return showEmpty ? <div className={cn(elWrap, 'py-10')}><EmptySlot target="amenities" title="+ Olanak ekle" className="min-h-[140px]" /></div> : null;
    }
    return (
        <section aria-labelledby="mk-olanak" {...amenT} className={cn(onDark, amenT.className)}>
            <div className={cn(elWrap, elSection, 'flex max-w-[1240px] flex-wrap gap-x-24 gap-y-14')}>
                <div className="flex min-w-0 flex-[1_1_340px] flex-col gap-[22px]">
                    <EliteKicker dark>Olanaklar</EliteKicker>
                    <h2 id="mk-olanak" className={cn(elTitle, 'md:text-[clamp(40px,4vw,62px)] md:leading-[1.05]')}>Her ayrıntı <em className="italic">düşünüldü.</em></h2>
                    {canReserveOnline(site) && !edit && (
                        <p className="m-0 max-w-[380px] text-base leading-[1.8] text-[var(--site-on-paper-sub)]">Özel bir isteğiniz varsa rezervasyon notuna yazmanız yeterli.</p>
                    )}
                </div>
                <ul className="m-0 grid min-w-0 flex-[999_1_560px] list-none grid-cols-1 gap-x-14 p-0 sm:grid-cols-2">
                    {amenities.map(a => (
                        <li key={a.key} className="flex items-baseline gap-4 border-b border-[color-mix(in_srgb,var(--site-accent-on-dark)_22%,transparent)] py-[22px]">
                            <span aria-hidden="true" className="h-px w-5 shrink-0 -translate-y-1.5 bg-[var(--site-accent-on-dark)]" />
                            <span className={cn(elSerif, 'min-w-0 break-words text-[22px] leading-snug md:text-2xl')}>{a.label}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}

// ── Galeri + Özel geceler ────────────────────────────────────────────────────────────────────────

function GalleryAndEvents({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const showEmpty = Boolean(edit?.showEmpty);
    const [expanded, setExpanded] = useState(false);
    const c = site.site;
    const all = venuePhotos(site);
    const hero = heroPhoto(site);
    // Sitede: yalnız mekân fotoğrafı varsa, kapakta görünen tekrarlanmaz. Düzenleyicide hepsi tıklanabilir.
    const photos = edit ? all : (c.galleryImageUrls.length > 0 ? all.filter(p => p !== hero) : []);
    const events = c.amenities.includes('ozel-gun');
    const whatsapp = c.whatsappPhone;
    const phone = site.phone;
    const showSpecial = events && (edit ? Boolean(whatsapp) : Boolean(whatsapp || phone));
    const canAdd = Boolean(edit) && c.galleryImageUrls.length < SITE_LIMITS.gallery;
    const open = Boolean(edit) || expanded;
    let special: ReactNode = null;
    if (showSpecial) special = <EventsTile site={site} />;
    else if (showEmpty) {
        special = events
            ? <EmptySlot target="contact" title="+ WhatsApp numarası ekle" className="min-h-[200px]" />
            : <EmptySlot target="amenities" title="+ “Grup ve özel gün organizasyonu” olanağını seçin" className="min-h-[200px]" />;
    }
    // Büyük kare 2×2; yanındaki dört hücreyi küçük kareler (ve varsa Özel geceler kutusu) doldurur.
    const [big, ...rest] = photos;
    const small = open ? rest : rest.slice(0, special ? MOSAIC_SMALL : MOSAIC_SMALL + 1);
    const hidden = Math.max(0, photos.length - 1 - small.length);
    if (!big && !special && !(edit && canAdd)) return null;

    const shot = (src: string, i: number) => {
        const { target, label } = photoTarget(site, src);
        const t = editTarget(edit, target, label);
        return (
            <>
                <img src={src} alt={`${restaurantName(site)}, mekân fotoğrafı ${i + 1}`} loading="lazy" {...t} className={cn('absolute inset-0 h-full w-full object-cover', t.className)} />
                {src.includes('/shared/stock/') && <StockImageLabel className="bottom-auto right-3 top-3" />}
            </>
        );
    };
    const tile = 'rb-el-zoom relative min-w-0 overflow-hidden';
    const ig = c.instagramUrl;
    const igT = editTarget(edit, 'contact', 'Instagram');

    return (
        <section aria-label="Mekândan fotoğraflar" className="bg-[var(--site-alt)]">
            <div className={cn(elWrap, 'grid max-w-[1320px] grid-cols-2 gap-3 py-20 sm:gap-4 md:auto-rows-[minmax(300px,auto)] md:grid-cols-4 md:py-[120px]')}>
                {big && (
                    <div className={cn(tile, 'col-span-2 aspect-[4/3] md:row-span-2 md:aspect-auto')}>
                        {shot(big, 0)}
                        {ig && (
                            <a href={ig} target="_blank" rel="noopener noreferrer" {...igT}
                                className={cn('absolute left-3 top-3 inline-flex min-h-11 items-center bg-[color-mix(in_srgb,var(--site-paper)_80%,transparent)] px-4 text-[11px] uppercase tracking-[0.22em] text-[var(--site-on-paper)] no-underline backdrop-blur-[6px]', igT.className)}>
                                {instagramHandle(ig)}
                            </a>
                        )}
                    </div>
                )}
                {small.map((src, i) => {
                    const more = !open && i === small.length - 1 && hidden > 0;
                    return (
                        <div key={src} className={cn(tile, 'aspect-square md:aspect-auto')}>
                            {shot(src, i + 1)}
                            {more && (
                                <button type="button" onClick={() => setExpanded(true)}
                                    className="absolute inset-0 flex items-center justify-center bg-[color-mix(in_srgb,var(--site-paper)_75%,transparent)] text-xs uppercase tracking-[0.26em] text-[var(--site-on-paper)]">
                                    +{hidden} fotoğraf
                                </button>
                            )}
                        </div>
                    );
                })}
                {canAdd && (
                    <div data-edit-target="gallery:add"
                        className="flex aspect-square cursor-pointer items-center justify-center border border-dashed border-[#CFC5B4] bg-[var(--site-card)] font-[family-name:'DM_Sans',system-ui,sans-serif] text-[15px] font-semibold text-[#8A7D6E] hover:border-[#2B7FFF] hover:text-[#1E4FA0] md:aspect-auto">
                        + Fotoğraf ekle
                    </div>
                )}
                {special && <div className={cn('col-span-2 min-w-0 md:col-span-1', !big && 'md:col-span-2')}>{special}</div>}
            </div>
        </section>
    );
}

function EventsTile({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const whatsapp = site.site.whatsappPhone;
    const phone = site.phone;
    const maxParty = canReserveOnline(site) && site.reservation.maxPartySize > 0 ? site.reservation.maxPartySize : null;
    const waT = editTarget(edit, 'contact', 'WhatsApp');
    const link = 'inline-flex min-h-11 items-center self-start text-[11px] uppercase tracking-[0.28em] text-[var(--site-accent-on-dark)] no-underline hover:opacity-80';
    return (
        <section aria-labelledby="mk-ozel" className={cn(onDark, 'flex h-full min-h-[260px] flex-col justify-between gap-6 p-7 md:p-8')}>
            <div className="flex flex-col gap-3">
                <span className={cn(elLabel, 'text-[11px] text-[var(--site-accent-on-dark)]')}>Özel geceler</span>
                <h2 id="mk-ozel" className={cn(elItalic, 'm-0 text-[26px] leading-[1.15] md:text-[28px]')}>Doğum günü, nişan, iş yemeği…</h2>
                <p className="m-0 text-sm leading-relaxed text-[var(--site-on-paper-sub)]">
                    {maxParty ? `Online rezervasyon ${maxParty} kişiye kadar; daha kalabalık gruplar için bize yazın ya da arayın.` : 'Kalabalık gruplar ve özel günler için bize yazın ya da arayın.'}
                </p>
            </div>
            <div className="flex flex-col">
                {whatsapp && <a href={whatsappHref(whatsapp)} target="_blank" rel="noopener noreferrer" {...waT} className={cn(link, waT.className)}>WhatsApp'tan yazın →</a>}
                {phone && <ExternalHint source="restaurant"><a href={telHref(phone)} aria-label={`Telefonla arayın: ${phone}`} className={link}>{phone} →</a></ExternalHint>}
            </div>
        </section>
    );
}

// ── Nasıl gelinir ────────────────────────────────────────────────────────────────────────────────

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
    // Bölüm yalnız adres ya da yol notu varsa (sayfanın asıl bilgisi); saat ve otopark tek başına bölüm açmaz.
    if (!(address || showNote || (edit && hours))) return null;
    const way = 'flex flex-col gap-1.5 border-b border-[color-mix(in_srgb,var(--site-text)_15%,transparent)] pb-5';
    const wayLabel = 'text-[11px] uppercase tracking-[0.3em] text-[var(--site-muted)]';
    const wayText = cn(elSerif, 'm-0 break-words text-[21px] leading-[1.35] md:text-[22px]');

    return (
        <section id={LOCATION_ID} aria-labelledby="mk-yol" className="scroll-mt-4 bg-[var(--site-bg)]">
            <div className={cn(elWrap, 'flex max-w-[1320px] flex-wrap pb-20 pt-20 md:pb-[140px] md:pt-[120px]')}>
                {address && (
                    <div aria-hidden="true"
                        className="relative min-h-[300px] min-w-0 flex-[999_1_600px] overflow-hidden bg-[var(--site-olive)] bg-[linear-gradient(color-mix(in_srgb,var(--site-on-paper)_4%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_srgb,var(--site-on-paper)_4%,transparent)_1px,transparent_1px)] bg-[length:34px_34px] md:min-h-[520px]">
                        <span className="absolute -left-[10%] -right-[10%] top-[42%] h-3 -rotate-[8deg] bg-[var(--site-footer-road)]" />
                        <span className="absolute -left-[10%] -right-[10%] top-[74%] h-[7px] rotate-[5deg] bg-[var(--site-footer-road)]" />
                        <span className="absolute -bottom-[10%] -top-[10%] left-[64%] w-[9px] rotate-[14deg] bg-[var(--site-footer-road)]" />
                        <div className="absolute left-1/2 top-[40%] flex max-w-[86%] -translate-x-1/2 -translate-y-full flex-col items-center gap-2.5">
                            <span className={cn(elSerif, 'max-w-full truncate bg-[var(--site-bg)] px-[18px] py-2.5 text-lg text-[var(--site-paper)]')}>{name}</span>
                            <span className="h-3.5 w-3.5 rounded-full bg-[var(--site-accent-on-dark)] shadow-[0_0_0_8px_color-mix(in_srgb,var(--site-accent-on-dark)_25%,transparent)]" />
                        </div>
                    </div>
                )}
                <div className="flex min-w-0 flex-[1_1_400px] flex-col gap-[30px] bg-[var(--site-alt)] px-5 py-10 sm:p-12 md:p-14">
                    <h2 id="mk-yol" className="m-0"><EliteKicker>Nasıl gelinir</EliteKicker></h2>
                    {address && <div className={way}><span className={wayLabel}>Adres</span><p className={wayText}>{address}</p></div>}
                    {showNote && (
                        <div className={way}>
                            <span className={wayLabel}>Ulaşım</span>
                            <EditableText as="p" field="directionsNote" value={c.directionsNote} multiline placeholder="Nasıl gelinir? (durak, hat, yürüme mesafesi)"
                                className={cn(wayText, 'whitespace-pre-line')} />
                        </div>
                    )}
                    {showParking && <div className={way}><span className={wayLabel}>Otopark</span><p className={wayText}>{parking.charAt(0).toLocaleUpperCase('tr-TR') + parking.slice(1)} var</p></div>}
                    {hours ? (
                        <EditableBlock target="hours" label="Çalışma saatleri">
                            <div className={way}>
                                <span className={wayLabel}>Çalışma saatleri</span>
                                <p className={wayText}>{hours}</p>
                                {c.hoursNote && <span className="text-sm text-[var(--site-sub)]">{c.hoursNote}</span>}
                            </div>
                        </EditableBlock>
                    ) : <EmptySlot target="hours" title="+ Saat ekle" />}
                    {address && (
                        <a href={directionsUrl(address)} target="_blank" rel="noopener noreferrer" className={cn(elButton.dark, 'mt-auto self-stretch')}>Yol tarifi al <span aria-hidden="true">→</span></a>
                    )}
                </div>
            </div>
        </section>
    );
}
