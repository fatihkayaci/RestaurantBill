import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { canReserveOnline, type PublicSite } from '@/features/customerSite/types';
import { cn } from '@/lib/utils';
import { SiteShell, SiteStatus } from './site/SiteChrome';
import { PageHero, SitePage } from './site/SiteFrame';
import {
    ClockIcon, DirectionsIcon, HeroStatusPill, HoursBlock, InfoCard, InstagramIcon, OpenBadge, PhoneIcon, WhatsAppIcon,
} from './site/SiteCards';
import {
    RESERVATION_PATH, cardButton, cardLabel, cardValue, eyebrow, instagramHandle, serif, siteCard, siteCardLg,
} from './site/siteParts';
import { directionsUrl, telHref, whatsappHref } from './site/siteTheme';
import { fullAddress, hoursLine, restaurantName, useSite, weekSchedule } from './site/useSite';
import ContactForm from './site/ContactForm';
import { EditableBlock, EditableText, EmptySlot, ExternalHint } from './site/siteEdit';
import { editExternal, useSiteEdit } from './site/siteEditContext';

// /iletisim (Öneri A+: seçilen A korunur). Kısa kapak + "şu an açık" hapı; telefonda kapağın hemen altında üç büyük
// eylem (Ara, Yol tarifi, WhatsApp) ve bugünün saati; harita (adresten Google Haritalar gömmesi, üstünde adres kartı)
// ile "Bize yazın" formu yan yana; altta gün gün saat tablosu (bugün vurgulu), "Nasıl gelinir", telefon, WhatsApp,
// Instagram ve koyu rezervasyon kartı. Girilmemiş bilgi gösterilmez: adres yoksa harita yok (form tam genişlik).

function mapEmbedUrl(address: string): string {
    return `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
}

/** Harita + üstünde yüzen adres kartı. */
function MapCard({ address, name }: { address: string; name: string }) {
    return (
        <div className="relative h-[300px] min-w-0 overflow-hidden rounded-[20px] border border-[var(--site-line)] bg-[var(--site-raised)] md:h-[440px] md:rounded-[24px] lg:h-auto lg:min-h-[560px]">
            <iframe
                src={mapEmbedUrl(address)}
                title={`${name} konumu, Google Haritalar`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="absolute inset-0 h-full w-full border-0"
            />
            <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2.5 rounded-[14px] bg-[var(--site-card)] px-3.5 py-3 text-[var(--site-text)] shadow-[0_10px_30px_rgba(20,16,12,0.12)] md:inset-x-5 md:bottom-5 md:flex-wrap md:gap-3 md:rounded-[18px] md:px-[18px] md:py-4">
                <div className="flex min-w-0 flex-col gap-0.5">
                    <span className={cn(cardLabel, 'hidden md:block')}>Adres</span>
                    <span className={cn(serif, 'text-[22px] leading-[1.1] md:text-[26px]')}>{address}</span>
                </div>
                <a href={directionsUrl(address)} target="_blank" rel="noopener noreferrer" className={cn(cardButton.dark, 'self-center px-3.5 text-[13px] md:px-[18px] md:text-sm')}>
                    <DirectionsIcon className="hidden md:block" />
                    <span>Yol tarifi<span className="hidden md:inline"> al</span></span>
                </a>
            </div>
        </div>
    );
}

/** Telefonda kapağın altındaki üç büyük eylem: Ara, Yol tarifi, WhatsApp (verisi olmayan çizilmez) ve bugünün saati. */
function QuickActions({ site }: { site: PublicSite }) {
    const x = editExternal(useSiteEdit(), 'actions');
    const address = fullAddress(site);
    const whatsapp = site.site.whatsappPhone;
    const items = [
        site.phone && { key: 'ara', label: 'Ara', icon: <PhoneIcon className="h-5 w-5" />, href: telHref(site.phone), external: false },
        address && { key: 'yol', label: 'Yol tarifi', icon: <DirectionsIcon className="h-5 w-5" />, href: directionsUrl(address), external: true },
        whatsapp && { key: 'wa', label: 'WhatsApp', icon: <WhatsAppIcon className="h-5 w-5" />, href: whatsappHref(whatsapp), external: true },
    ].filter(Boolean) as { key: string; label: string; icon: ReactNode; href: string; external: boolean }[];
    const rows = weekSchedule(site);
    const today = rows?.find(r => r.isToday);
    const uniform = rows?.every(r => r.isOpen && r.text === rows[0].text);
    if (items.length === 0 && !today) return null;
    return (
        <div {...x} className={cn('flex flex-col gap-2.5 md:hidden', x.className)}>
            {items.length > 0 && (
                <div className={cn('grid gap-2.5', items.length === 3 ? 'grid-cols-3' : items.length === 2 ? 'grid-cols-2' : 'grid-cols-1')}>
                    {items.map((a, i) => (
                        <a key={a.key} href={a.href} target={a.external ? '_blank' : undefined} rel="noopener noreferrer"
                            className={cn('flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-2xl text-[15px] font-semibold',
                                i === 0 ? 'bg-[var(--site-accent)] text-[var(--site-on-accent)]' : cn(siteCard, 'rounded-2xl'))}>
                            {a.icon}{a.label}
                        </a>
                    ))}
                </div>
            )}
            {today && (
                <a href="#saatler" className={cn(siteCard, 'flex items-center justify-between gap-3 rounded-2xl p-4')}>
                    <span className="flex flex-col">
                        <span className={cardLabel}>{uniform ? 'Her gün' : `Bugün · ${today.label}`}</span>
                        <span className={cn(serif, 'text-[24px] leading-tight tabular-nums')}>{today.text}</span>
                    </span>
                    <span className="flex flex-col items-end gap-1">
                        {site.isOpenNow !== null && <OpenBadge open={site.isOpenNow} />}
                        {!uniform && <span className="text-sm font-semibold underline underline-offset-4">Tüm hafta →</span>}
                    </span>
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
                <p className="m-0 hidden text-[15px] leading-normal text-[var(--site-sub)] md:block">Mesajınızı doğrudan restoran ekibi okur. İletişim bilgisi bırakırsanız size dönüş yaparız.</p>
            </div>
            <div className={cn(wide && 'max-w-[760px]')}>
                <ContactForm branchId={branchId} />
            </div>
        </section>
    );
}

export default function RestaurantContactPage() {
    const { site, error } = useSite();
    const edit = useSiteEdit();
    if (!site) return <SiteShell><SiteStatus error={error} /></SiteShell>;
    const showEmpty = Boolean(edit?.showEmpty);

    // İletişim bilgisi hiç girilmemişse aynı düzen kendiliğinden yalnız formdan (ve varsa rezervasyon kartından) oluşur.
    const content = site.site;
    const name = restaurantName(site);
    const address = fullAddress(site);
    const hasHours = Boolean(hoursLine(site));
    const canReserve = canReserveOnline(site);
    const hasCards = Boolean(site.phone || hasHours || content.instagramUrl || content.whatsappPhone || content.directionsNote || canReserve) || showEmpty;

    return (
        <SitePage site={site} current="iletisim">
            <PageHero site={site} label={name} title="İletişim" compact aside={<HeroStatusPill site={site} />}
                image={content.contactHeroUrl} imageTarget="photo:hero-iletisim" imageLabel="İletişim kapağı" />
            <main className="mx-auto flex w-full max-w-[1344px] flex-1 flex-col gap-4 px-5 pb-10 pt-5 md:gap-8 md:px-12 md:pb-16 md:pt-16">
                <QuickActions site={site} />
                <div className={cn('grid grid-cols-1 gap-4 md:gap-8', address && 'lg:grid-cols-2')}>
                    {address && <ExternalHint source="restaurant" className="min-w-0"><MapCard address={address} name={name} /></ExternalHint>}
                    <ExternalHint source="messages" className="min-w-0">
                        <WriteCard branchId={site.branchId} wide={!address} />
                    </ExternalHint>
                </div>

                {hasCards && (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))]">
                        {hasHours && (
                            <div id="saatler" className="scroll-mt-24">
                                <EditableBlock target="hours" label="Çalışma saatleri" className="h-full rounded-[20px]">
                                    <InfoCard icon={<ClockIcon />} label="Çalışma saatleri" labelId="ilt-saat" className="h-full"
                                        action={site.isOpenNow !== null && <OpenBadge open={site.isOpenNow} />}>
                                        <HoursBlock site={site} />
                                        {content.hoursNote && <p className="m-0 text-sm text-[var(--site-sub)]">{content.hoursNote}</p>}
                                    </InfoCard>
                                </EditableBlock>
                            </div>
                        )}
                        {!hasHours && showEmpty && <EmptySlot target="hours" title="+ Saat ekle" />}
                        {(content.directionsNote || showEmpty) && (
                            <InfoCard icon={<DirectionsIcon />} label="Nasıl gelinir" labelId="ilt-yol"
                                action={address && <a href={directionsUrl(address)} target="_blank" rel="noopener noreferrer" className={cn(cardButton.outline, 'mt-auto')}>Yol tarifi al</a>}>
                                <EditableText as="p" field="directionsNote" value={content.directionsNote} multiline placeholder="Nasıl gelinir?"
                                    className="m-0 whitespace-pre-line text-[15px] leading-relaxed" />
                            </InfoCard>
                        )}
                        {site.phone && (
                            <ExternalHint source="restaurant" className="hidden md:block">
                                <InfoCard icon={<PhoneIcon />} label="Telefon" labelId="ilt-tel" className={edit ? 'h-full' : 'hidden md:flex'}
                                    action={<a href={telHref(site.phone)} className={cn(cardButton.outline, 'mt-auto')}>Ara</a>}>
                                    <span className={cardValue}>{site.phone}</span>
                                </InfoCard>
                            </ExternalHint>
                        )}
                        {content.whatsappPhone ? (
                            <EditableBlock target="contact" label="WhatsApp" className="hidden h-full rounded-[20px] md:block">
                                <InfoCard icon={<WhatsAppIcon />} label="WhatsApp" labelId="ilt-wa" className={edit ? 'h-full' : 'hidden md:flex'}
                                    action={<a href={whatsappHref(content.whatsappPhone)} target="_blank" rel="noopener noreferrer" className={cn(cardButton.outline, 'mt-auto')}>Yaz</a>}>
                                    <span className={cardValue}>{content.whatsappPhone}</span>
                                </InfoCard>
                            </EditableBlock>
                        ) : showEmpty && <EmptySlot target="contact" title="+ WhatsApp ekle" />}
                        {content.instagramUrl ? (
                            <EditableBlock target="contact" label="Instagram" className="h-full rounded-[20px]">
                                <InfoCard icon={<InstagramIcon />} label="Instagram" labelId="ilt-ig" className="h-full"
                                    action={<a href={content.instagramUrl} target="_blank" rel="noopener noreferrer" className={cn(cardButton.outline, 'mt-auto')}>Takip et</a>}>
                                    <span className={cn(cardValue, 'break-all')}>{instagramHandle(content.instagramUrl)}</span>
                                </InfoCard>
                            </EditableBlock>
                        ) : showEmpty && <EmptySlot target="contact" title="+ Instagram ekle" />}
                        {canReserve && (
                            <ExternalHint source="reservation" className="h-full">
                                <InfoCard tone="dark" label="Rezervasyon" labelId="ilt-rez" className="h-full"
                                    action={<Link to={RESERVATION_PATH} className={cn(cardButton.accent, 'mt-auto h-[52px] w-full self-stretch text-base md:h-11 md:w-auto md:self-start md:text-sm')}>Masa ayırt</Link>}>
                                    <p className={cn(serif, 'm-0 text-[30px] leading-[1.05] md:text-[32px]')}>Masanızı <span className="italic">ayırtın.</span></p>
                                    <p className="m-0 hidden text-sm text-[var(--site-on-paper-sub)] md:block">Birkaç adımda masanızı seçin, onay bize kalsın.</p>
                                </InfoCard>
                            </ExternalHint>
                        )}
                    </div>
                )}
            </main>
        </SitePage>
    );
}
