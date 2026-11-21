import { useId, useState, type ReactNode } from 'react';
import type { PublicSite } from '@/features/customerSite/types';
import { useOnlineOrdering } from '@/features/delivery/useOnlineOrderingAvailable';
import { cn } from '@/lib/utils';
import { SitePage } from '../../SiteFrame';
import ContactForm from '../../ContactForm';
import FaqEditorBox from '../../FaqEditorBox';
import { MapPanel } from '../../VenueParts';
import { visibleFaqs } from '../../siteFaqs';
import { instagramHandle, serif, untilTime } from '../../siteParts';
import { directionsUrl, telHref, whatsappHref } from '../../siteTheme';
import { fullAddress, restaurantName, weekSchedule } from '../../useSite';
import { EditableBlock, EditableText, EmptySlot, ExternalHint } from '../../siteEdit';
import { useSiteEdit } from '../../siteEditContext';
import type { DesignPageProps } from '../registry';
import { LampString, MhHeading, NightBackdrop, ReserveBand, TonightStrip } from './MeyhaneBits';
import { mhLeader, mhLink, mhNarrow, mhSign, mhUnderHeader, mhWrap } from './meyhaneParts';

// Meyhane Gecesi İletişim: telefon sayfanın kahramanı (meyhaneye çoğu zaman arayarak masa ayırtılır).
// (1) Gece kapağı: "Bize ulaşın", altında dev telefon numarası (dokununca arar) ve bu akşamın saati.
// (2) Kanallar basılı menü satırı gibi: Telefon · noktalı çizgi · numara (WhatsApp, Instagram, adres de).
// (3) Saatler (bugün işaretli, noktalı satırlar) ve harita + adres + nasıl gelinir, yan yana.
// (4) "Mesaj bırakın" formu, dar sütunda. (5) Sık sorulanlar: açılır satırlar. (6) "Masa ayırt" bandı.

function timeOfDay(iso: string): string {
    return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

export default function MeyhaneContact({ site }: DesignPageProps) {
    const edit = useSiteEdit();
    return (
        <SitePage site={site} current="iletisim">
            <main className="flex flex-1 flex-col">
                <Hero site={site} />
                <Channels site={site} />
                <HoursAndPlace site={site} />
                {!edit && (
                    <ExternalHint source="messages">
                        <section aria-labelledby="mh-mesaj" className={cn(mhNarrow, 'flex flex-col gap-8 py-16 sm:py-24')}>
                            <MhHeading id="mh-mesaj" title="Mesaj bırakın" note="Öneri, şikâyet ya da özel bir gün; okunur ve iletişim bıraktıysanız dönülür." />
                            <div className="rounded-[20px] border border-[var(--site-border-mid)] bg-[var(--site-card)] p-5 sm:p-9">
                                <ContactForm branchId={site.branchId} phone={site.phone || undefined} />
                            </div>
                        </section>
                    </ExternalHint>
                )}
                {edit ? <div className={cn(mhWrap, 'py-10')}><FaqEditorBox site={site} /></div> : <Faq site={site} />}
                <ReserveBand site={site} />
            </main>
        </SitePage>
    );
}

function Hero({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    return (
        <section aria-labelledby="mh-ilt" className={cn('relative isolate overflow-hidden', !edit && mhUnderHeader)}>
            <NightBackdrop image={site.site.contactHeroUrl || undefined} target="photo:hero-iletisim" label="İletişim kapağı" emptyHint="+ İletişim kapağı seç" />
            <LampString className="top-[76px] lg:top-[92px]" sag={30} />
            <div className="pointer-events-none relative z-[1] [&_[data-edit-target]]:pointer-events-auto mx-auto flex max-w-[900px] flex-col items-center gap-6 px-4 pb-14 pt-[150px] text-center sm:px-8 lg:pt-[176px] [&_a]:pointer-events-auto">
                <h1 id="mh-ilt" className={cn(mhSign, 'text-[52px] sm:text-[80px] md:text-[104px]')}>Bize ulaşın</h1>
                {site.phone && !edit && (
                    <ExternalHint source="restaurant">
                        <a href={telHref(site.phone)} className={cn(serif, 'inline-flex min-h-11 items-center break-all text-[34px] leading-none text-[var(--site-accent-text)] no-underline tabular-nums underline-offset-8 hover:underline sm:text-[52px]')}>
                            <span className="sr-only">Ara: </span>{site.phone}
                        </a>
                    </ExternalHint>
                )}
                <TonightStrip site={site} />
            </div>
        </section>
    );
}

interface ChannelRowData { key: string; label: string; value: string; href: string; external?: boolean; wrap?: (n: ReactNode) => ReactNode }

function Channels({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const showEmpty = Boolean(edit?.showEmpty);
    const c = site.site;
    const address = fullAddress(site);
    const contactWrap = (label: string) => (n: ReactNode) => <EditableBlock target="contact" label={label}>{n}</EditableBlock>;
    const rows: ChannelRowData[] = [];
    if (site.phone && !edit) rows.push({ key: 'tel', label: 'Telefon', value: site.phone, href: telHref(site.phone) });
    if (c.whatsappPhone) rows.push({ key: 'wa', label: 'WhatsApp', value: c.whatsappPhone, href: whatsappHref(c.whatsappPhone), external: true, wrap: contactWrap('WhatsApp') });
    if (c.instagramUrl) rows.push({ key: 'ig', label: 'Instagram', value: instagramHandle(c.instagramUrl), href: c.instagramUrl, external: true, wrap: contactWrap('Instagram') });
    if (address && !edit) rows.push({ key: 'adres', label: 'Adres', value: site.openAddress || address, href: directionsUrl(address), external: true });
    const empties = showEmpty ? [!c.whatsappPhone && 'WhatsApp', !c.instagramUrl && 'Instagram'].filter((x): x is string => Boolean(x)) : [];
    if (rows.length === 0 && empties.length === 0) return null;
    return (
        <section aria-label="İletişim kanalları" className={cn(mhNarrow, 'pt-10 sm:pt-14')}>
            <ul className="m-0 flex list-none flex-col border-t border-[var(--site-border-mid)] p-0">
                {rows.map(r => {
                    const link = (
                        <a href={r.href} target={r.external ? '_blank' : undefined} rel={r.external ? 'noopener noreferrer' : undefined}
                            className="group flex min-h-16 items-baseline gap-3 py-4 text-[var(--site-text)] no-underline">
                            <span className="shrink-0 text-[15px] text-[var(--site-sub)]">{r.label}</span>
                            <span aria-hidden="true" className={mhLeader} />
                            <span className={cn(serif, 'min-w-0 break-words text-right text-[21px] leading-tight decoration-[var(--site-accent-line)] underline-offset-4 group-hover:underline sm:text-[26px]')}>{r.value}</span>
                        </a>
                    );
                    return <li key={r.key} className="border-b border-[var(--site-border-mid)]">{r.wrap ? r.wrap(link) : link}</li>;
                })}
                {empties.map(label => (
                    <li key={label} className="border-b border-[var(--site-border-mid)] py-3"><EmptySlot target="contact" title={`+ ${label} ekle`} className="min-h-[56px]" /></li>
                ))}
            </ul>
        </section>
    );
}

function HoursAndPlace({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const showEmpty = Boolean(edit?.showEmpty);
    const ordering = useOnlineOrdering();
    const rows = weekSchedule(site);
    const address = fullAddress(site);
    const note = site.site.directionsNote;
    const lastOrder = ordering?.state === 'open' && ordering.lastOrderAt ? timeOfDay(ordering.lastOrderAt) : null;
    const showPlace = (Boolean(address) && !edit) || Boolean(note) || showEmpty;
    if (!rows && !showPlace && !showEmpty) return null;
    return (
        <div className={cn(mhWrap, 'grid gap-12 pt-16 sm:pt-24 md:grid-cols-2 md:gap-16')}>
            {rows ? (
                <EditableBlock target="hours" label="Çalışma saatleri">
                    <section id="saatler" aria-labelledby="mh-saat" className="flex scroll-mt-24 flex-col gap-5">
                        <h2 id="mh-saat" className={cn(serif, 'm-0 text-[34px] leading-none sm:text-[40px]')}>Saatler</h2>
                        <dl className="m-0 flex flex-col border-t border-[var(--site-border-mid)]">
                            {rows.map(r => (
                                <div key={r.day} className={cn('flex items-baseline gap-3 border-b border-[var(--site-line)] py-3 text-[17px]', r.isToday ? 'text-[var(--site-text)]' : 'text-[var(--site-sub)]')}>
                                    <dt className={cn(r.isToday && 'font-bold')}>{r.label}{r.isToday && <span className="ml-2 text-[13px] font-bold text-[var(--site-accent-text)]">bugün</span>}</dt>
                                    <span aria-hidden="true" className={mhLeader} />
                                    <dd className={cn('m-0 tabular-nums', r.isToday && 'font-bold text-[var(--site-accent-text)]')}>{r.text}</dd>
                                </div>
                            ))}
                            {lastOrder && !edit && (
                                <div className="flex items-baseline gap-3 py-3 text-[15px] text-[var(--site-sub)]">
                                    <dt>Paket sipariş</dt><span aria-hidden="true" className={mhLeader} /><dd className="m-0 font-bold text-[var(--site-text)]">{untilTime(lastOrder)}</dd>
                                </div>
                            )}
                        </dl>
                        {site.site.hoursNote && <p className="m-0 text-sm text-[var(--site-sub)]">{site.site.hoursNote}</p>}
                    </section>
                </EditableBlock>
            ) : showEmpty ? <EmptySlot target="hours" title="+ Çalışma saatlerini ekle" /> : <div />}
            {showPlace && (
                <section aria-labelledby="mh-yer" className="flex flex-col gap-5">
                    <h2 id="mh-yer" className={cn(serif, 'm-0 text-[34px] leading-none sm:text-[40px]')}>Nasıl gelinir</h2>
                    {address && !edit && (
                        <ExternalHint source="restaurant">
                            <a href={directionsUrl(address)} target="_blank" rel="noopener noreferrer" aria-label="Haritada aç" className="block overflow-hidden rounded-[18px] border border-[var(--site-border-mid)]">
                                <MapPanel name={restaurantName(site)} className="h-[220px] sm:h-[260px]" />
                            </a>
                        </ExternalHint>
                    )}
                    {address && !edit && (
                        <p className={cn(serif, 'm-0 break-words text-[22px] leading-[1.25]')}>
                            {site.openAddress || address}
                            {site.openAddress && (site.district || site.city) && <><br />{[site.district, site.city].filter(Boolean).join(' / ')}</>}
                        </p>
                    )}
                    {(note || showEmpty) && (
                        <EditableText as="p" field="directionsNote" value={note} multiline placeholder="Nasıl gelinir? (kısa tarif)"
                            className="m-0 whitespace-pre-line text-base leading-relaxed text-[var(--site-sub)]" />
                    )}
                    {address && !edit && <a href={directionsUrl(address)} target="_blank" rel="noopener noreferrer" className={cn(mhLink, 'self-start')}>Yol tarifi al</a>}
                </section>
            )}
        </div>
    );
}

/** Sık sorulanlar: açılır satırlar (soru başlık yazı tipinde, cevap altında). Cevabı olmayan soru çizilmez. */
function Faq({ site }: { site: PublicSite }) {
    const faqs = visibleFaqs(site, useOnlineOrdering());
    const [open, setOpen] = useState(0);
    const base = useId();
    if (faqs.length === 0) return null;
    return (
        <section aria-labelledby="mh-sss" className={cn(mhNarrow, 'flex flex-col gap-8 pb-16 sm:pb-24')}>
            <MhHeading id="mh-sss" title="Sık sorulanlar" />
            <div className="flex flex-col border-t border-[var(--site-border-mid)]">
                {faqs.map((f, i) => {
                    const isOpen = open === i;
                    const id = `${base}-${f.key}`;
                    return (
                        <div key={f.key} className="border-b border-[var(--site-border-mid)]">
                            <h3 className="m-0">
                                <button type="button" aria-expanded={isOpen} aria-controls={id} onClick={() => setOpen(isOpen ? -1 : i)}
                                    className="flex min-h-16 w-full items-center justify-between gap-4 bg-transparent py-4 text-left text-[var(--site-text)]">
                                    <span className={cn(serif, 'text-[20px] leading-snug sm:text-[23px]')}>{f.q}</span>
                                    <span aria-hidden="true" className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--site-accent-line)] text-[var(--site-accent-text)] transition-transform duration-200 motion-reduce:transition-none', isOpen && 'rotate-45')}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                                    </span>
                                </button>
                            </h3>
                            {isOpen && <p id={id} className="m-0 pb-6 text-base leading-[1.7] text-[var(--site-sub)]">{f.a}</p>}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
