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
import { EsHeading, OpenLine, PhoneGlyph, TileStrip } from './EsnafBits';
import { useEsnafMobileActions } from './esnafActions';
import { esButton, esLink, esSign, esWrap } from './esnafParts';

// Esnaf Tabelası İletişim: esnafa telefonla ulaşılır, sayfanın kahramanı DEV ARA DÜĞMESİ ("Alo, buyurun").
// (1) Tabela: "Alo, buyurun" başlığı; altında ekran genişliğinde sarı telefon düğmesi (numara dev büyük), yanında WhatsApp,
//     Instagram ve yol tarifi düğmeleri; bugünün saati. Çini şerit.
// (2) Yan yana: mürekkep KARA TAHTA'da gün gün saatler (bugün sarı şeritte) ve kalın çerçeveli harita + adres + tarif.
// (3) Mesaj formu ve sık sorulanlar yan yana (telefonda alt alta).

function timeOfDay(iso: string): string {
    return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

export default function EsnafContact({ site }: DesignPageProps) {
    const edit = useSiteEdit();
    const mobileActions = useEsnafMobileActions(site, 'iletisim');
    return (
        <SitePage site={site} current="iletisim" mobileActions={mobileActions}>
            <main className="flex flex-1 flex-col">
                <Hero site={site} />
                <HoursAndPlace site={site} />
                <div className={cn(esWrap, 'grid items-start gap-12 pb-14 sm:pb-20 lg:grid-cols-2 lg:gap-14')}>
                    {!edit && (
                        <ExternalHint source="messages">
                            <section aria-labelledby="es-mesaj" className="flex min-w-0 flex-col gap-6">
                                <EsHeading id="es-mesaj" title="Mesaj bırakın" note="Öneri, şikâyet ya da özel bir gün; okunur, iletişim bıraktıysanız dönülür." />
                                <div className="rounded-md border-[3px] border-[var(--site-text)] bg-[var(--site-card)] p-5 sm:p-7">
                                    <ContactForm branchId={site.branchId} phone={site.phone || undefined} />
                                </div>
                            </section>
                        </ExternalHint>
                    )}
                    {edit ? <FaqEditorBox site={site} /> : <Faq site={site} />}
                </div>
            </main>
        </SitePage>
    );
}

function Hero({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const showEmpty = Boolean(edit?.showEmpty);
    const c = site.site;
    const address = fullAddress(site);
    const contactWrap = (label: string, node: ReactNode) => <EditableBlock target="contact" label={label}>{node}</EditableBlock>;
    const hasSocial = Boolean(c.whatsappPhone || c.instagramUrl);
    return (
        <section aria-labelledby="es-ilt" className="rb-es-sign bg-[var(--site-hero-bg)] text-[var(--site-on-cover)]">
            <div className={cn(esWrap, 'flex flex-col gap-7 pb-12 pt-10 sm:pt-14')}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <h1 id="es-ilt" className={cn(esSign, 'text-[72px] sm:text-[112px] lg:text-[140px]')}>Alo, buyurun</h1>
                    <OpenLine site={site} className="text-[15px]" dotClassName="ring-2 ring-[var(--site-on-cover)]" />
                </div>
                {site.phone && !edit && (
                    <ExternalHint source="restaurant">
                        <a href={telHref(site.phone)}
                            className="group flex min-h-[96px] w-full items-center justify-between gap-4 rounded-md bg-[var(--site-pop)] px-5 py-4 text-[var(--site-on-pop)] no-underline shadow-[inset_0_-8px_0_rgba(0,0,0,0.18)] transition-[filter] hover:brightness-105 sm:px-8">
                            <span className="flex min-w-0 flex-col gap-1">
                                <span className="text-sm font-extrabold uppercase tracking-[0.12em]">Hemen ara</span>
                                <span className={cn(serif, 'break-all text-[40px] leading-none tabular-nums sm:text-[64px] lg:text-[80px]')}>{site.phone}</span>
                            </span>
                            <PhoneGlyph className="h-12 w-12 shrink-0 transition-transform duration-200 group-hover:rotate-[-12deg] motion-reduce:transition-none sm:h-16 sm:w-16" />
                        </a>
                    </ExternalHint>
                )}
                {(hasSocial || (address && !edit) || showEmpty) && (
                    <div className="flex flex-wrap gap-3">
                        {c.whatsappPhone && contactWrap('WhatsApp', <a href={whatsappHref(c.whatsappPhone)} target="_blank" rel="noopener noreferrer" className={esButton.onSign}>WhatsApp: {c.whatsappPhone}</a>)}
                        {c.instagramUrl && contactWrap('Instagram', <a href={c.instagramUrl} target="_blank" rel="noopener noreferrer" className={esButton.onSign}>{instagramHandle(c.instagramUrl)}</a>)}
                        {address && !edit && <a href={directionsUrl(address)} target="_blank" rel="noopener noreferrer" className={esButton.onSign}>Yol tarifi</a>}
                        {showEmpty && !hasSocial && <EmptySlot target="contact" title="+ WhatsApp ya da Instagram ekle" className="min-h-[56px] bg-[var(--site-card)]" />}
                    </div>
                )}
            </div>
            <TileStrip />
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
        <div className={cn(esWrap, 'grid items-start gap-10 py-14 sm:py-20 md:grid-cols-2 md:gap-12')}>
            {rows ? (
                <EditableBlock target="hours" label="Çalışma saatleri">
                    {/* Kara tahta: mürekkep zemin, krem yazı, bugün sarı şerit. */}
                    <section id="saatler" aria-labelledby="es-saat" className="flex scroll-mt-24 flex-col gap-4 rounded-md bg-[var(--site-paper)] p-5 text-[var(--site-on-paper)] shadow-[inset_0_0_0_4px_var(--site-paper),inset_0_0_0_6px_var(--site-paper-line-strong)] sm:p-7">
                        <h2 id="es-saat" className={cn(serif, 'm-0 text-[40px] leading-none sm:text-[48px]')}>Saatler</h2>
                        <dl className="m-0 flex flex-col">
                            {rows.map(r => (
                                <div key={r.day} className={cn('flex items-baseline justify-between gap-4 rounded-[4px] px-2.5 py-2 text-[17px]',
                                    r.isToday ? 'bg-[var(--site-pop)] font-extrabold text-[var(--site-on-pop)]' : 'border-b border-dashed border-[var(--site-paper-line-strong)] text-[var(--site-on-paper-sub)]')}>
                                    <dt>{r.label}{r.isToday && <span className="ml-2 text-xs uppercase tracking-[0.08em]">bugün</span>}</dt>
                                    <dd className="m-0 tabular-nums">{r.text}</dd>
                                </div>
                            ))}
                            {lastOrder && !edit && (
                                <div className="flex items-baseline justify-between gap-4 px-2.5 py-2 text-[15px] text-[var(--site-on-paper-sub)]">
                                    <dt>Paket sipariş</dt><dd className="m-0 font-bold text-[var(--site-on-paper)]">{untilTime(lastOrder)}</dd>
                                </div>
                            )}
                        </dl>
                        {site.site.hoursNote && <p className="m-0 text-sm text-[var(--site-on-paper-sub)]">{site.site.hoursNote}</p>}
                    </section>
                </EditableBlock>
            ) : showEmpty ? <EmptySlot target="hours" title="+ Çalışma saatlerini ekle" /> : <div />}
            {showPlace && (
                <section aria-labelledby="es-yer" className="flex min-w-0 flex-col gap-5">
                    <h2 id="es-yer" className={cn(serif, 'm-0 text-[40px] leading-none sm:text-[48px]')}>Nasıl gelinir</h2>
                    {address && !edit && (
                        <ExternalHint source="restaurant">
                            <a href={directionsUrl(address)} target="_blank" rel="noopener noreferrer" aria-label="Haritada aç" className="block overflow-hidden rounded-md border-[3px] border-[var(--site-text)]">
                                <MapPanel name={restaurantName(site)} className="h-[220px] sm:h-[280px]" />
                            </a>
                        </ExternalHint>
                    )}
                    {address && !edit && (
                        <p className="m-0 break-words text-[20px] font-bold leading-snug">
                            {site.openAddress || address}
                            {site.openAddress && (site.district || site.city) && <><br /><span className="font-semibold text-[var(--site-sub)]">{[site.district, site.city].filter(Boolean).join(' / ')}</span></>}
                        </p>
                    )}
                    {(note || showEmpty) && (
                        <EditableText as="p" field="directionsNote" value={note} multiline placeholder="Nasıl gelinir? (kısa tarif)"
                            className="m-0 whitespace-pre-line text-base leading-relaxed text-[var(--site-sub)]" />
                    )}
                    {address && !edit && <a href={directionsUrl(address)} target="_blank" rel="noopener noreferrer" className={cn(esLink, 'self-start')}>Yol tarifi al</a>}
                </section>
            )}
        </div>
    );
}

/** Sık sorulanlar: kalın çizgili açılır satırlar. Cevabı olmayan soru çizilmez. */
function Faq({ site }: { site: PublicSite }) {
    const faqs = visibleFaqs(site, useOnlineOrdering());
    const [open, setOpen] = useState(0);
    const base = useId();
    if (faqs.length === 0) return null;
    return (
        <section aria-labelledby="es-sss" className="flex min-w-0 flex-col gap-6">
            <EsHeading id="es-sss" title="Sık sorulanlar" />
            <div className="flex flex-col">
                {faqs.map((f, i) => {
                    const isOpen = open === i;
                    const id = `${base}-${f.key}`;
                    return (
                        <div key={f.key} className="border-b-2 border-[var(--site-text)]">
                            <h3 className="m-0">
                                <button type="button" aria-expanded={isOpen} aria-controls={id} onClick={() => setOpen(isOpen ? -1 : i)}
                                    className="flex min-h-16 w-full items-center justify-between gap-4 bg-transparent py-4 text-left text-[var(--site-text)]">
                                    <span className="text-[18px] font-bold leading-snug">{f.q}</span>
                                    <span aria-hidden="true" className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-[var(--site-bg)] transition-[transform,background-color] duration-200 motion-reduce:transition-none',
                                        isOpen ? 'rotate-45 bg-[var(--site-accent)] text-[var(--site-on-accent)]' : 'bg-[var(--site-text)]')}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="square"><path d="M12 5v14M5 12h14" /></svg>
                                    </span>
                                </button>
                            </h3>
                            {isOpen && <p id={id} className="m-0 pb-5 text-base leading-[1.7] text-[var(--site-sub)]">{f.a}</p>}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
