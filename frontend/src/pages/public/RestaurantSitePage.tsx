import { useState, type CSSProperties, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { canReserveOnline, type PublicCategory, type PublicProduct } from '@/features/customerSite/types';
import { cn } from '@/lib/utils';
import DergiReserve from './site/DergiReserve';
import { MyReservations, SiteShell, SiteStatus } from './site/SiteChrome';
import { HeaderSpacer, SitePage } from './site/SiteFrame';
import { RESERVATION_PATH, eyebrow, instagramHandle, line, moreArrow, moreLink, reservationHref, serif } from './site/siteParts';
import { formatSitePrice, telHref } from './site/siteTheme';
import { hoursText, restaurantName, useMyReservations, useSite } from './site/useSite';

// Eski rezervasyon adresi (/?bolum=rezervasyon&tarih&saat&kisi) artık /rezervasyon sayfasına yönlenir.
const LEGACY_VIEW_PARAM = 'bolum';
const MAX_INDEX_ROWS = 5;
const STRIP_PHOTOS = 6;
const BADGE_PATH_LENGTH = 351; // 2π·56: rozetteki yazı yolunun uzunluğu
const BADGE_CHARS = 32;
const MARQUEE_MIN_CHARS = 110; // 60px serifte bir kopyanın geniş ekranı (≈2500px) doldurması için

// Dev isim: tasarımda 330px; uzun adlar ekrana sığsın diye harf sayısına göre küçülür (italik serif ≈ 0,42em/harf).
function fitName(name: string, maxPx: number, widthVw = 92): CSSProperties {
    const vw = widthVw / (Math.max(3, name.length) * 0.42);
    return { fontSize: `min(${maxPx}px, ${vw.toFixed(2)}vw)` };
}

function priceRange(category: PublicCategory): string {
    const prices = category.products.map(p => p.price);
    if (prices.length === 0) return '';
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? formatSitePrice(min) : `${min.toLocaleString('tr-TR')} – ${formatSitePrice(max)}`;
}

// Restoranın müşteriye açık sitesi, ana sayfa (tasarım: canvas "Restoran Sitesi v2" · Birleşik · açık).
// Bölümler: dev isimli giriş + dönen rozet, kayan kategori şeridi, menü dizini (en fazla 5 kategori, üstüne gelinen
// kategorinin fotoğrafı sağda), Hakkımızda cümlesi, mekân, saat tablolu rezervasyon, fotoğraf şeridi; başlık ve beyaz
// alt bilgi ortak çerçeveden (SiteFrame). Hakkımızda, Mekân, İletişim ve Rezervasyon'un ayrı sayfaları da var.
// Kural: restoranın girmediği veri uydurulmaz; o bölüm/öğe hiç çizilmez. Sipariş özelliği olmadığından
// tasarımdaki "Sipariş"/"Sipariş ver" yerine menüye giden bağlantılar var.
export default function RestaurantSitePage() {
    const { site, error } = useSite();
    const { mine } = useMyReservations();
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const [hovered, setHovered] = useState(0);

    if (params.get(LEGACY_VIEW_PARAM) === 'rezervasyon') {
        const next = new URLSearchParams(params);
        next.delete(LEGACY_VIEW_PARAM);
        const query = next.toString();
        return <Navigate to={query ? `${RESERVATION_PATH}?${query}` : RESERVATION_PATH} replace />;
    }

    if (!site) {
        return <SiteShell><SiteStatus error={error} /></SiteShell>;
    }

    const name = restaurantName(site);
    const content = site.site;
    // Rezervasyon kapalıysa ya da hiç açık gün yoksa site rezervasyon bölümünü ve bağlantılarını göstermez.
    const canReserve = canReserveOnline(site);

    const location = [site.district, site.city].filter(Boolean).join(', ');
    const hours = hoursText(site);
    const hasCover = Boolean(content.coverImageUrl);
    const categories = site.categories;
    const photos = categories.flatMap(c => c.products).filter(p => p.imageUrl);

    // Girişin alt satırı ve rozet yazısı: restoranın gerçek verisi (ilk üç kategori, konum, ad).
    const heroLine = [categories.slice(0, 3).map(c => c.name).join(' · '), location].filter(Boolean).join(' — ');
    const badgeText = [name, site.district || site.city].filter(Boolean).join(' ✦ ').toLocaleUpperCase('tr-TR');
    // Rozet çemberi ≈ 32 harf alır: kısa yazı tekrarlanır, sığıyorsa çembere tam yayılır (boşluk kalmaz).
    const badgeUnit = `${badgeText} ✦ `;
    const badgeRing = badgeUnit.repeat(Math.max(1, Math.floor(BADGE_CHARS / badgeUnit.length)));
    const badgeFits = badgeRing.length <= BADGE_CHARS + 2;

    // Kayan şerit: bir kopya ekranı doldursun diye az kategoride liste tekrarlanır (yoksa döngüde boşluk görünür).
    const marqueeBase = [...categories.map(c => c.name), ...(canReserve ? ['Masa ayırt'] : [])];
    const marqueeChars = marqueeBase.join('   ').length || 1;
    const marqueeLabels = Array.from({ length: Math.max(2, Math.ceil(MARQUEE_MIN_CHARS / marqueeChars)) }, () => marqueeBase).flat();

    // Menü dizini: en fazla beş kategori; her birinin fiyat aralığı ve ilk üç ürünü.
    const indexRows = categories.slice(0, MAX_INDEX_ROWS).map((c, i) => ({
        category: c,
        no: String(i + 1).padStart(2, '0'),
        price: priceRange(c),
        sub: c.products.slice(0, 3).map(p => p.name).join(', '),
        photo: c.products.find(p => p.imageUrl),
    }));
    const anyIndexPhoto = indexRows.some(r => r.photo);
    const current = indexRows[Math.min(hovered, indexRows.length - 1)];

    const hasStory = Boolean(content.storyTitle || content.about);
    const venuePhotos = photos.slice(0, 3);
    const hasVenue = Boolean(content.headline || content.tagline || content.aboutImageUrl);
    const stripPhotos = photos.slice(0, STRIP_PHOTOS);

    return (
        <SitePage site={site} current="home">
                {/* GİRİŞ */}
                <section id="ust" className="relative flex min-h-[640px] flex-col overflow-hidden bg-[#2A2622] text-white md:h-[900px]">
                    {hasCover && (
                        <>
                            <img src={content.coverImageUrl} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
                            <div aria-hidden="true" className="absolute inset-0 bg-[rgba(20,16,12,0.34)]" />
                        </>
                    )}
                    <HeaderSpacer />
                    <div className="relative flex flex-1 flex-col items-center justify-center gap-2.5 px-5 text-center md:px-8">
                        <h1 className={cn(serif, 'm-0 max-w-full whitespace-nowrap italic leading-[0.82] tracking-[-0.04em]')} style={fitName(name, 330)}>{name}</h1>
                        {heroLine && <span className="text-xs font-medium uppercase tracking-[0.24em] md:text-[13px] md:tracking-[0.32em]">{heroLine}</span>}
                    </div>
                    <div className="relative grid grid-cols-1 items-end gap-4 px-5 pb-8 pt-6 text-sm sm:grid-cols-2 md:grid-cols-3 md:px-12 md:pb-9 md:pt-7">
                        {hours ? (
                            <span className="flex items-center gap-2.5">
                                {site.isOpenNow !== null && (
                                    <span aria-hidden="true" className={cn('h-2 w-2 rounded-full', site.isOpenNow ? 'bg-[#5EE08F]' : 'bg-[#F4A28C]')} />
                                )}
                                {site.isOpenNow === null ? 'Her gün' : site.isOpenNow ? 'Bugün açık' : 'Şu an kapalı'} · {hours}
                            </span>
                        ) : <span className="hidden sm:block" />}
                        <Link to="/menu" className="flex h-14 items-center justify-self-start rounded-full bg-[var(--site-accent)] px-[30px] font-semibold tracking-[0.02em] text-[var(--site-on-accent)] sm:justify-self-end md:justify-self-center">
                            Menüyü gör
                        </Link>
                        <span className="hidden md:block" />
                    </div>
                    {/* Dönen rozet: restoranın adı ve semti çevrede, baş harfi ortada (süs) */}
                    <div aria-hidden="true" className="absolute bottom-12 right-14 hidden h-[150px] w-[150px] items-center justify-center rounded-full bg-[#F5F2ED] text-[#141414] lg:flex">
                        <svg width="150" height="150" viewBox="0 0 150 150" className="rb-don absolute inset-0">
                            <defs><path id="rb-daire" d="M75,75 m-56,0 a56,56 0 1,1 112,0 a56,56 0 1,1 -112,0" /></defs>
                            <text fontFamily="Inter, sans-serif" fontSize="12.5" fontWeight="600" letterSpacing="3.2" fill="#141414"
                                textLength={badgeFits ? BADGE_PATH_LENGTH : undefined} lengthAdjust="spacing">
                                <textPath href="#rb-daire">{badgeRing}</textPath>
                            </text>
                        </svg>
                        <span className={cn(serif, 'text-[40px] italic text-[var(--site-accent)]')}>{name.trim().charAt(0).toLocaleLowerCase('tr-TR')}</span>
                    </div>
                </section>

                {/* KAYAN ŞERİT: kategoriler */}
                {categories.length > 0 && (
                    <div aria-hidden="true" className={cn('overflow-hidden whitespace-nowrap border-b bg-white py-[22px]', line)}>
                        <div className={cn(serif, 'rb-kay inline-flex text-[44px] leading-none md:text-[60px]')}>
                            {[0, 1].map(copy => (
                                <span key={copy} className="pr-10">
                                    {marqueeLabels.map((label, i) => (
                                        <span key={i}>
                                            {i % 2 === 1 ? <em>{label}</em> : label}{' '}
                                            <span className="text-[var(--site-accent)]">✦</span>{' '}
                                        </span>
                                    ))}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* MENÜ DİZİNİ (en fazla 5 kategori) */}
                {indexRows.length > 0 && current && (
                    <section id="menu" className="mx-auto flex w-full max-w-[1344px] flex-wrap items-start gap-16 px-5 py-24 md:px-12 md:pb-[140px] md:pt-[130px]">
                        <div className="flex min-w-0 flex-[999_1_620px] flex-col">
                            <div className="flex items-baseline justify-between pb-[18px] text-xs font-medium uppercase tracking-[0.24em] text-[#6F6A63]">
                                <span>Menü</span><span>Fiyatlar</span>
                            </div>
                            {indexRows.map((r, i) => {
                                const on = r === current;
                                return (
                                    <Link
                                        key={r.category.id}
                                        to={`/menu#kat-${r.category.id}`}
                                        onMouseEnter={() => setHovered(i)}
                                        onFocus={() => setHovered(i)}
                                        className={cn('flex items-center gap-4 border-t pb-2.5 pt-4 transition-[color,padding] duration-200 md:gap-6', line,
                                            on ? 'pl-3.5 text-[#141414]' : 'text-[#9E968A]')}
                                    >
                                        <span className="w-9 shrink-0 text-[13px] text-[#6F6A63]">{r.no}</span>
                                        <span className={cn(serif, 'min-w-0 flex-1 break-words text-[40px] leading-[0.95] tracking-[-0.02em] sm:text-[64px] md:text-[80px] lg:text-[104px]')}>{r.category.name}</span>
                                        <span className="flex shrink-0 flex-col items-end gap-0.5 text-right">
                                            {r.price && <span className="text-base font-medium md:text-lg">{r.price}</span>}
                                            {r.sub && <span className="hidden max-w-[22ch] truncate text-sm text-[#6F6A63] sm:block">{r.sub}</span>}
                                        </span>
                                    </Link>
                                );
                            })}
                            <Link to="/menu" className={cn(serif, 'mt-7 flex items-center gap-3.5 self-start border-b border-[#141414] pb-1 text-[32px] italic text-[#141414]')}>
                                Tüm menü <span className="font-[family-name:'Inter',sans-serif] text-sm not-italic text-[#6F6A63]">{categories.length} kategori →</span>
                            </Link>
                        </div>
                        {anyIndexPhoto && (
                            <Link to={`/menu#kat-${current.category.id}`} className="sticky top-24 hidden min-w-0 flex-[1_1_380px] flex-col gap-3.5 xl:flex">
                                <span className="block overflow-hidden rounded">
                                    {current.photo ? (
                                        <img src={current.photo.imageUrl} alt={current.photo.name} className="block aspect-[4/5] w-full object-cover transition-transform duration-700 hover:scale-[1.04]" />
                                    ) : (
                                        <span className={cn(serif, 'flex aspect-[4/5] w-full items-center justify-center bg-[#EDE8DF] text-[44px] italic text-[#141414]')}>{current.category.name}</span>
                                    )}
                                </span>
                                <span className="flex justify-between text-xs font-medium uppercase tracking-[0.2em] text-[#6F6A63]">
                                    <span>{current.category.name}</span><span>{current.no} / {String(indexRows.length).padStart(2, '0')}</span>
                                </span>
                            </Link>
                        )}
                    </section>
                )}

                {/* HAKKIMIZDA */}
                {hasStory && (
                    <section id="hakkimizda" className={cn('border-y bg-white', line)}>
                        <div className="mx-auto flex max-w-[1240px] flex-col items-center gap-[34px] px-5 py-24 text-center md:px-12 md:py-[150px]">
                            <span className={eyebrow}>Hakkımızda</span>
                            {content.storyTitle && (
                                <h2 className={cn(serif, 'm-0 text-[56px] leading-[0.98] tracking-[-0.025em] sm:text-[88px] lg:text-[124px]')}>
                                    <StorySentence text={content.storyTitle} photo={photos[0]} />
                                </h2>
                            )}
                            {content.about && <p className="m-0 line-clamp-6 max-w-[46ch] whitespace-pre-line text-[19px] text-[#4A4640]">{content.about}</p>}
                            <Link to="/hakkimizda" className={cn(moreLink, 'self-center')}>
                                Hakkımızda <span aria-hidden="true" className={moreArrow}>→</span>
                            </Link>
                        </div>
                    </section>
                )}

                {/* MEKÂN */}
                {hasVenue && (
                    <section id="mekan" className="flex flex-wrap">
                        {content.aboutImageUrl && (
                            <div className="h-[420px] min-w-0 flex-[1_1_560px] overflow-hidden md:h-[820px]">
                                <img src={content.aboutImageUrl} alt="" className="block h-full w-full object-cover transition-transform duration-700 hover:scale-[1.04]" />
                            </div>
                        )}
                        <div className={cn('flex min-w-0 flex-[1_1_520px] flex-col justify-center gap-[26px] px-5 py-20 md:px-20 md:py-[110px]',
                            !content.aboutImageUrl && 'mx-auto max-w-[1240px]')}>
                            <span className={eyebrow}>Mekân</span>
                            {content.headline && (
                                <h2 className={cn(serif, 'm-0 text-[52px] leading-[0.95] tracking-[-0.02em] md:text-[92px]')}>{content.headline}</h2>
                            )}
                            {content.tagline && <p className="m-0 max-w-[40ch] text-lg text-[#4A4640]">{content.tagline}</p>}
                            {venuePhotos.length === 3 && (
                                <div className="grid grid-cols-3 gap-2.5 pt-1.5">
                                    {venuePhotos.map(p => (
                                        <img key={p.id} src={p.imageUrl} alt={p.name} className="aspect-square w-full rounded object-cover" />
                                    ))}
                                </div>
                            )}
                            {content.instagramUrl && (
                                <a href={content.instagramUrl} target="_blank" rel="noopener noreferrer"
                                    className="self-start border-b border-[#141414] pb-[3px] text-[13px] font-medium uppercase tracking-[0.16em] text-[#141414]">
                                    Instagram'da daha fazlası
                                </a>
                            )}
                            <Link to="/mekan" className={moreLink}>
                                Mekânı keşfet <span aria-hidden="true" className={moreArrow}>→</span>
                            </Link>
                        </div>
                    </section>
                )}

                {/* REZERVASYON: solda başlık + açıklama, sağda saat tablosu */}
                {canReserve && (
                    <section id="rezervasyon" className={cn('border-t bg-[#EDE8DF]', line)}>
                        <div className="mx-auto flex max-w-[1344px] flex-wrap items-start gap-16 px-5 py-24 md:px-12 md:py-[130px]">
                            <div className="flex min-w-0 flex-[1_1_340px] flex-col gap-[22px] pt-2">
                                <span className={eyebrow}>Rezervasyon</span>
                                <h2 className={cn(serif, 'm-0 text-[60px] leading-[0.92] tracking-[-0.025em] md:text-[100px]')}>Masanızı <span className="italic">ayırtın.</span></h2>
                                <p className="m-0 max-w-[34ch] text-lg text-[#4A4640]">Gün ve saati seçin; restoran onayladığında talebinizin durumunu bu sayfada görürsünüz.</p>
                                <div className="flex flex-col gap-2.5 pt-2.5 text-sm text-[#4A4640]">
                                    <span className="flex items-center gap-2.5"><span aria-hidden="true" className="h-3.5 w-3.5 rounded border border-[#CFC8BC] bg-white" />Müsait</span>
                                    <span className="flex items-center gap-2.5"><span aria-hidden="true" className="h-3.5 w-3.5 rounded bg-[var(--site-accent)]" />Seçili</span>
                                    <span className="flex items-center gap-2.5"><span aria-hidden="true" className="h-3.5 w-3.5 rounded border border-dashed border-[#B8B1A6]" />Dolu</span>
                                    {site.phone && (
                                        <span className="pt-2">Kalabalık gruplar için: <a href={telHref(site.phone)} className="whitespace-nowrap font-semibold text-[#141414]">{site.phone}</a></span>
                                    )}
                                </div>
                                {mine.length > 0 && <MyReservations items={mine} className="w-full pt-2" />}
                            </div>
                            <div className="min-w-0 flex-[1.4_1_600px]">
                                <DergiReserve branchId={site.branchId} rules={site.reservation} onContinue={choice => navigate(reservationHref(choice))} />
                            </div>
                        </div>
                    </section>
                )}

                {/* FOTOĞRAF ŞERİDİ: menüdeki ürün fotoğrafları; Instagram adresi girildiyse ortada bağlantı */}
                {stripPhotos.length === STRIP_PHOTOS && (
                    <section aria-label="Fotoğraflar" className="relative grid grid-cols-3 md:grid-cols-6">
                        {stripPhotos.map(p => (
                            <img key={p.id} src={p.imageUrl} alt={p.name} className="block aspect-square w-full object-cover" />
                        ))}
                        {content.instagramUrl && (
                            <a href={content.instagramUrl} target="_blank" rel="noopener noreferrer"
                                className="absolute left-1/2 top-1/2 flex h-14 max-w-[calc(100%-32px)] -translate-x-1/2 -translate-y-1/2 items-center gap-2.5 rounded-full bg-white px-7 font-semibold text-[#141414] shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
                                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="shrink-0">
                                    <rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" />
                                </svg>
                                <span className="truncate">{instagramHandle(content.instagramUrl)}</span>
                            </a>
                        )}
                    </section>
                )}

        </SitePage>
    );
}

// Hakkımızda cümlesi: restoranın yazdığı başlık. Fotoğraflı bir ürün varsa cümlenin ortasına tek bir hap fotoğraf girer.
function StorySentence({ text, photo }: { text: string; photo?: PublicProduct }): ReactNode {
    const words = text.trim().split(/\s+/);
    if (!photo || words.length < 4) return <>{text.trim()}</>;
    const at = Math.ceil(words.length / 2);
    return (
        <>
            {words.slice(0, at).join(' ')}{' '}
            <img src={photo.imageUrl} alt={photo.name}
                className="-mt-[0.1em] inline-block h-[0.78em] w-[1.6em] rounded-full object-cover align-middle" />{' '}
            {words.slice(at).join(' ')}
        </>
    );
}
