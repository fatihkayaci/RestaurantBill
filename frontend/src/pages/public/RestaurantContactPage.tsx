import { Link } from 'react-router-dom';
import { canReserveOnline, type PublicSite } from '@/features/customerSite/types';
import { cn } from '@/lib/utils';
import { SiteShell, SiteStatus } from './site/SiteChrome';
import { PageHero, SitePage } from './site/SiteFrame';
import { ClockIcon, DirectionsIcon, HeroStatusPill, InfoCard, InstagramIcon, OpenBadge, PhoneIcon } from './site/SiteCards';
import {
    RESERVATION_PATH, cardButton, cardLabel, cardValue, eyebrow, instagramHandle, serif, siteCard, siteCardLg,
} from './site/siteParts';
import { directionsUrl, telHref } from './site/siteTheme';
import { fullAddress, hoursText, restaurantName, useSite } from './site/useSite';
import ContactForm from './site/ContactForm';

// /iletisim (restoranın alan adında). Kısa kapak + "şu an açık" hapı; altında harita (adresten Google Haritalar
// gömmesi, üstünde adres kartı ve "Yol tarifi al") ile "Bize yazın" formu yan yana; en altta telefon, çalışma
// saatleri, Instagram ve koyu rezervasyon kartı. Girilmemiş bilgi gösterilmez: adres yoksa harita yok (form tam
// genişlik), telefon/saat/Instagram yoksa o kart yok. Dar ekranda telefon ve Instagram haritanın altında iki hızlı düğme.

function mapEmbedUrl(address: string): string {
    return `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
}

/** Harita + üstünde yüzen adres kartı. */
function MapCard({ address, name }: { address: string; name: string }) {
    return (
        <div className="relative h-[300px] min-w-0 overflow-hidden rounded-[20px] border border-[#DDD7CE] bg-[#E9E4DA] md:h-[440px] md:rounded-[24px] lg:h-auto lg:min-h-[560px]">
            <iframe
                src={mapEmbedUrl(address)}
                title={`${name} konumu, Google Haritalar`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="absolute inset-0 h-full w-full border-0"
            />
            <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2.5 rounded-[14px] bg-white px-3.5 py-3 shadow-[0_10px_30px_rgba(20,16,12,0.12)] md:inset-x-5 md:bottom-5 md:flex-wrap md:gap-3 md:rounded-[18px] md:px-[18px] md:py-4">
                <div className="flex min-w-0 flex-col gap-0.5">
                    <span className={cn(cardLabel, 'hidden md:block')}>Adres</span>
                    <span className={cn(serif, 'text-[22px] leading-[1.1] text-[#141414] md:text-[26px]')}>{address}</span>
                </div>
                <a href={directionsUrl(address)} target="_blank" rel="noopener noreferrer" className={cn(cardButton.dark, 'self-center px-3.5 text-[13px] md:px-[18px] md:text-sm')}>
                    <DirectionsIcon className="hidden md:block" />
                    <span>Yol tarifi<span className="hidden md:inline"> al</span></span>
                </a>
            </div>
        </div>
    );
}

/** Dar ekranda haritanın altındaki "Ara" ve "Instagram" kısayolları (geniş ekranda alttaki kartlar gösterilir). */
function QuickLinks({ site }: { site: PublicSite }) {
    const instagram = site.site.instagramUrl;
    if (!site.phone && !instagram) return null;
    const quick = cn(siteCard, 'flex min-h-11 min-w-0 flex-col gap-1 rounded-2xl p-3.5 only:col-span-2');
    return (
        <div className="grid grid-cols-2 gap-2.5 md:hidden">
            {site.phone && (
                <a href={telHref(site.phone)} className={quick}>
                    <span className={cardLabel}>Ara</span>
                    <span className="text-[15px] font-semibold">{site.phone}</span>
                </a>
            )}
            {instagram && (
                <a href={instagram} target="_blank" rel="noopener noreferrer" className={quick}>
                    <span className={cardLabel}>Instagram</span>
                    <span className="truncate text-[15px] font-semibold">{instagramHandle(instagram)}</span>
                </a>
            )}
        </div>
    );
}

/** "Bize yazın" kartı: başlık, açıklama ve form. */
function WriteCard({ branchId, wide }: { branchId: string; wide: boolean }) {
    return (
        <section aria-labelledby="ilt-yazin" className={cn(siteCardLg, 'flex min-w-0 flex-col gap-3.5 p-5 md:gap-[18px] md:p-9')}>
            <div className={cn('flex flex-col gap-2', wide && 'max-w-[760px]')}>
                <span className={cn(eyebrow, 'text-[11px] tracking-[0.26em] md:text-xs md:tracking-[0.28em]')}>Bize yazın</span>
                <h2 id="ilt-yazin" className={cn(serif, 'm-0 text-[34px] leading-[1.05] md:text-[44px]')}>Öneri, şikâyet ya da <span className="italic">bir soru.</span></h2>
                <p className="m-0 hidden text-[15px] leading-normal text-[#5E5850] md:block">Mesajınızı doğrudan restoran ekibi okur. İletişim bilgisi bırakırsanız size dönüş yaparız.</p>
            </div>
            <div className={cn(wide && 'max-w-[760px]')}>
                <ContactForm branchId={branchId} />
            </div>
        </section>
    );
}

export default function RestaurantContactPage() {
    const { site, error } = useSite();
    if (!site) return <SiteShell><SiteStatus error={error} /></SiteShell>;

    // İletişim bilgisi hiç girilmemişse (hasContactPage false) aynı düzen kendiliğinden yalnız formdan
    // (ve varsa rezervasyon kartından) oluşur: haritasız tam genişlik form, bilgi kartları yok, kapakta hap yok.
    const content = site.site;
    const name = restaurantName(site);
    const address = fullAddress(site);
    const hours = hoursText(site);
    const canReserve = canReserveOnline(site);
    const hasCards = Boolean(site.phone || hours || content.instagramUrl || canReserve);

    return (
        <SitePage site={site} current="iletisim">
            <PageHero
                site={site}
                label={name}
                title="İletişim"
                compact
                aside={<HeroStatusPill site={site} />}
            />
            <main className="mx-auto flex w-full max-w-[1344px] flex-1 flex-col gap-4 px-5 pb-12 pt-5 md:gap-8 md:px-12 md:pb-24 md:pt-16">
                <div className={cn('grid grid-cols-1 gap-4 md:gap-8', address && 'lg:grid-cols-2')}>
                    {address && <MapCard address={address} name={name} />}
                    <QuickLinks site={site} />
                    <WriteCard branchId={site.branchId} wide={!address} />
                </div>

                {hasCards && (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))]">
                        {site.phone && (
                            <InfoCard icon={<PhoneIcon />} label="Telefon" labelId="ilt-tel" className="hidden md:flex"
                                action={<a href={telHref(site.phone)} className={cardButton.outline}>Hemen ara</a>}>
                                <span className={cardValue}>{site.phone}</span>
                            </InfoCard>
                        )}
                        {hours && (
                            <InfoCard icon={<ClockIcon />} label="Çalışma saatleri" labelId="ilt-saat"
                                action={site.isOpenNow !== null && <OpenBadge open={site.isOpenNow} />}>
                                {/* Saat verisi tek aralık (her gün aynı); günlere göre saat gelirse burada satır satır listelenir. */}
                                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                                    <span className="text-[15px] font-semibold">Her gün</span>
                                    <span className={cn(cardValue, 'tabular-nums')}>{hours}</span>
                                </div>
                                {content.hoursNote && <p className="m-0 text-sm text-[#5E5850]">{content.hoursNote}</p>}
                            </InfoCard>
                        )}
                        {content.instagramUrl && (
                            <InfoCard icon={<InstagramIcon />} label="Instagram" labelId="ilt-ig" className="hidden md:flex"
                                action={<a href={content.instagramUrl} target="_blank" rel="noopener noreferrer" className={cardButton.outline}>Takip et</a>}>
                                <span className={cn(cardValue, 'break-all')}>{instagramHandle(content.instagramUrl)}</span>
                            </InfoCard>
                        )}
                        {canReserve && (
                            <InfoCard tone="dark" label="Rezervasyon" labelId="ilt-rez"
                                action={<Link to={RESERVATION_PATH} className={cn(cardButton.accent, 'h-[52px] w-full self-stretch text-base md:h-11 md:w-auto md:self-start md:text-sm')}>Masa ayırt</Link>}>
                                <p className={cn(serif, 'm-0 text-[30px] leading-[1.05] md:text-[32px]')}>Masanızı <span className="italic">ayırtın.</span></p>
                                <p className="m-0 hidden text-sm text-[#BDBDBD] md:block">Birkaç adımda masanızı seçin, onay bize kalsın.</p>
                            </InfoCard>
                        )}
                    </div>
                )}
            </main>
        </SitePage>
    );
}
