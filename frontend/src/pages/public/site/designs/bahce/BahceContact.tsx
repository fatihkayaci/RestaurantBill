import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { canReserveOnline, type PublicSite } from '@/features/customerSite/types';
import { useOnlineOrdering } from '@/features/delivery/useOnlineOrderingAvailable';
import { cn } from '@/lib/utils';
import { SitePage } from '../../SiteFrame';
import ContactForm from '../../ContactForm';
import FaqEditorBox from '../../FaqEditorBox';
import { MapPanel } from '../../VenueParts';
import { visibleFaqs } from '../../siteFaqs';
import { RESERVATION_PATH, instagramHandle, untilTime } from '../../siteParts';
import { directionsUrl, telHref, whatsappHref } from '../../siteTheme';
import { fullAddress, restaurantName, weekSchedule } from '../../useSite';
import { EditableBlock, EditableText, EmptySlot, ExternalHint } from '../../siteEdit';
import { useSiteEdit } from '../../siteEditContext';
import type { DesignPageProps } from '../registry';
import { BhHeading, MorningChip, Sprig, SunMark, WeekendCard } from './BahceBits';
import { bhButton, bhDisplay, bhLink, bhNarrow, bhWrap, weekendLine } from './bahceParts';

// Bahçe Kahvaltısı İletişim:
// (1) Kapak panosu (kapak renginde, yuvarlak): "Bize ulaşın", dokununca arayan büyük telefon hapı, bugünün saati;
//     yanında WhatsApp / Instagram / yol tarifi yuvarlak düğmeleri.
// (2) "Haftanın sofrası": yedi gün yedi tabak; her tabakta günün saati, bugün vurgu halkalı, hafta sonu tereyağı.
//     Altında hafta sonu notu (hafta sonu saatleri farklıysa ya da rezervasyon açıksa; yalnız gerçek ayardan).
// (3) Harita damla çerçevede, adres ve nasıl gelinir. (4) "Mesaj bırakın" formu yuvarlak kartta. (5) Sık sorulanlar:
//     yuvarlak açılır kartlar. (6) Hafta sonu kartı.

function timeOfDay(iso: string): string {
    return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

export default function BahceContact({ site }: DesignPageProps) {
    const edit = useSiteEdit();
    return (
        <SitePage site={site} current="iletisim">
            <main className="flex flex-1 flex-col">
                <Hero site={site} />
                <WeekPlates site={site} />
                <Place site={site} />
                {!edit && (
                    <ExternalHint source="messages">
                        <section aria-labelledby="bh-mesaj" className={cn(bhNarrow, 'flex flex-col gap-8 py-16 sm:py-24')}>
                            <BhHeading id="bh-mesaj" title="Mesaj bırakın" note="Öneri, şikâyet ya da özel bir gün; okunur ve iletişim bıraktıysanız dönülür." />
                            <div className="rounded-[32px] border border-[var(--site-border)] bg-[var(--site-card)] p-5 sm:p-9">
                                <ContactForm branchId={site.branchId} phone={site.phone || undefined} />
                            </div>
                        </section>
                    </ExternalHint>
                )}
                {edit ? <div className={cn(bhWrap, 'py-10')}><FaqEditorBox site={site} /></div> : <Faq site={site} />}
                <WeekendCard site={site} />
            </main>
        </SitePage>
    );
}

function Hero({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const showEmpty = Boolean(edit?.showEmpty);
    const c = site.site;
    const address = fullAddress(site);
    const round = 'inline-flex min-h-12 items-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--site-on-cover)_14%,transparent)] px-5 text-[15px] font-bold text-[var(--site-on-cover)] no-underline transition-colors hover:bg-[color-mix(in_srgb,var(--site-on-cover)_24%,transparent)]';
    return (
        <section aria-labelledby="bh-ilt" className="px-2.5 pb-10 pt-4 sm:px-5 sm:pt-6">
            <div className="relative mx-auto flex max-w-[1200px] flex-col items-start gap-6 overflow-hidden rounded-[40px] bg-[var(--site-hero-bg)] px-5 py-12 text-[var(--site-on-cover)] sm:px-12 sm:py-16">
                <span aria-hidden="true" className="rb-bh-table pointer-events-none absolute -bottom-[40%] -right-[12%] h-[120%] w-[56%] rounded-full opacity-70 max-sm:hidden" />
                <SunMark className="relative h-12 w-12" />
                <h1 id="bh-ilt" className={cn(bhDisplay, 'relative text-[56px] sm:text-[88px] md:text-[108px]')}>Bize ulaşın</h1>
                {site.phone && !edit && (
                    <ExternalHint source="restaurant">
                        <a href={telHref(site.phone)} className="relative inline-flex min-h-16 max-w-full items-center gap-3 rounded-full bg-[var(--site-mustard)] px-6 text-[var(--site-text)] no-underline shadow-[inset_0_-4px_0_color-mix(in_srgb,var(--site-text)_14%,transparent)] transition-[filter] hover:brightness-105 sm:min-h-20 sm:px-8">
                            <span className="sr-only">Ara: </span>
                            <span className="break-all font-[family-name:var(--site-serif)] text-[28px] font-bold leading-none tabular-nums tracking-[-0.02em] sm:text-[44px]">{site.phone}</span>
                        </a>
                    </ExternalHint>
                )}
                <MorningChip site={site} tone="cover" weekend className="relative" />
                <div className="relative flex flex-wrap gap-2">
                    {c.whatsappPhone && (
                        <EditableBlock target="contact" label="WhatsApp" className="rounded-full">
                            <a href={whatsappHref(c.whatsappPhone)} target="_blank" rel="noopener noreferrer" className={round}>WhatsApp {c.whatsappPhone}</a>
                        </EditableBlock>
                    )}
                    {c.instagramUrl && (
                        <EditableBlock target="contact" label="Instagram" className="rounded-full">
                            <a href={c.instagramUrl} target="_blank" rel="noopener noreferrer" className={round}>{instagramHandle(c.instagramUrl)}</a>
                        </EditableBlock>
                    )}
                    {address && !edit && <a href={directionsUrl(address)} target="_blank" rel="noopener noreferrer" className={round}>Yol tarifi</a>}
                    {showEmpty && !c.whatsappPhone && <EmptySlot target="contact" title="+ WhatsApp ekle" className="min-h-12 rounded-full" />}
                    {showEmpty && !c.instagramUrl && <EmptySlot target="contact" title="+ Instagram ekle" className="min-h-12 rounded-full" />}
                </div>
            </div>
        </section>
    );
}

const SHORT_DAY: Record<number, string> = { 0: 'Paz', 1: 'Pzt', 2: 'Sal', 3: 'Çar', 4: 'Per', 5: 'Cum', 6: 'Cmt' };

/** Yedi gün yedi tabak: tabakta gün ve saat; bugün vurgu halkası, hafta sonu tereyağı, kapalı gün kesikli. */
function WeekPlates({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const ordering = useOnlineOrdering();
    const rows = weekSchedule(site);
    const lastOrder = ordering?.state === 'open' && ordering.lastOrderAt ? timeOfDay(ordering.lastOrderAt) : null;
    if (!rows) return edit?.showEmpty ? <div className={cn(bhWrap, 'pb-10')}><EmptySlot target="hours" title="+ Çalışma saatlerini ekle" /></div> : null;
    const weekend = weekendLine(site);
    const canReserve = canReserveOnline(site);
    return (
        <EditableBlock target="hours" label="Çalışma saatleri">
            <section id="saatler" aria-labelledby="bh-saat" className={cn(bhWrap, 'flex scroll-mt-24 flex-col gap-8 py-10 sm:py-14')}>
                <BhHeading id="bh-saat" title="Haftanın sofrası" />
                <ul className="m-0 grid list-none grid-cols-4 gap-x-2 gap-y-4 p-0 sm:grid-cols-7 sm:gap-3">
                    {rows.map(r => {
                        const wknd = r.day === 0 || r.day === 6;
                        const [opens, closes] = r.isOpen && r.text.includes('–') ? r.text.split('–').map(t => t.trim()) : [r.text, ''];
                        return (
                            <li key={r.day} className="min-w-0">
                                <div className={cn('mx-auto flex aspect-square w-full max-w-[132px] flex-col items-center justify-center gap-0.5 rounded-full text-center',
                                    r.isOpen ? 'rb-bh-plate' : 'border-2 border-dashed border-[var(--site-border-mid)]',
                                    r.isOpen && wknd && 'bg-[var(--site-mustard)]',
                                    r.isToday && 'outline outline-[3px] outline-offset-[3px] outline-[var(--site-accent)]')}>
                                    <span className="text-[13px] font-bold sm:text-[14px]"><span aria-hidden="true">{SHORT_DAY[r.day]}</span><span className="sr-only">{r.label}{r.isToday && ' (bugün)'}</span></span>
                                    <span className={cn('text-[12px] font-semibold leading-tight tabular-nums sm:text-[13px]', !r.isOpen && 'text-[var(--site-sub)]')}>
                                        {opens}{closes && <><br />{closes}</>}
                                    </span>
                                </div>
                            </li>
                        );
                    })}
                </ul>
                {(weekend || canReserve || lastOrder || site.site.hoursNote) && (
                    <div className="flex flex-col gap-2 rounded-[28px] bg-[var(--site-alt)] p-5 text-[15px] leading-relaxed sm:flex-row sm:items-center sm:gap-6 sm:p-6">
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                            {weekend && <p className="m-0 font-bold">{weekend}</p>}
                            {site.site.hoursNote && <p className="m-0 text-[var(--site-sub)]">{site.site.hoursNote}</p>}
                            {lastOrder && !edit && <p className="m-0 text-[var(--site-sub)]">Paket sipariş {untilTime(lastOrder)}</p>}
                            {canReserve && <p className="m-0 text-[var(--site-sub)]">Hafta sonu kahvaltısı için masanızı önceden ayırtabilirsiniz.</p>}
                        </div>
                        {canReserve && !edit && <Link to={RESERVATION_PATH} className={cn(bhButton.accent, 'self-start sm:self-center')}>Masa ayırt</Link>}
                    </div>
                )}
            </section>
        </EditableBlock>
    );
}

function Place({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const showEmpty = Boolean(edit?.showEmpty);
    const address = fullAddress(site);
    const note = site.site.directionsNote;
    if (!(address && !edit) && !note && !showEmpty) return null;
    return (
        <section aria-labelledby="bh-yer" className={cn(bhWrap, 'grid items-center gap-10 py-10 sm:py-14 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:gap-14')}>
            {address && !edit ? (
                <ExternalHint source="restaurant">
                    <div className="relative">
                        <a href={directionsUrl(address)} target="_blank" rel="noopener noreferrer" aria-label="Haritada aç" className="rb-bh-blob block overflow-hidden border-4 border-[var(--site-card)] shadow-[0_24px_50px_-30px_color-mix(in_srgb,var(--site-text)_60%,transparent)]">
                            <MapPanel name={restaurantName(site)} className="aspect-[5/4] h-auto w-full" />
                        </a>
                        <Sprig className="absolute -bottom-4 -right-2 w-[130px] rotate-[160deg] scale-y-[-1]" />
                    </div>
                </ExternalHint>
            ) : <div />}
            <div className="flex min-w-0 flex-col gap-5">
                <h2 id="bh-yer" className={cn(bhDisplay, 'text-[38px] sm:text-[48px]')}>Bahçeye nasıl gelinir</h2>
                {address && !edit && (
                    <p className="m-0 break-words text-[20px] font-semibold leading-[1.4]">
                        {site.openAddress || address}
                        {site.openAddress && (site.district || site.city) && <><br /><span className="font-normal text-[var(--site-sub)]">{[site.district, site.city].filter(Boolean).join(' / ')}</span></>}
                    </p>
                )}
                {(note || showEmpty) && (
                    <EditableText as="p" field="directionsNote" value={note} multiline placeholder="Nasıl gelinir? (kısa tarif)"
                        className="m-0 whitespace-pre-line rounded-[24px] bg-[var(--site-alt)] p-5 text-base leading-relaxed text-[var(--site-sub)]" />
                )}
                {address && !edit && <a href={directionsUrl(address)} target="_blank" rel="noopener noreferrer" className={cn(bhLink, 'self-start')}>Yol tarifi al</a>}
            </div>
        </section>
    );
}

/** Sık sorulanlar: yuvarlak açılır kartlar. Cevabı olmayan soru çizilmez. */
function Faq({ site }: { site: PublicSite }) {
    const faqs = visibleFaqs(site, useOnlineOrdering());
    const [open, setOpen] = useState(0);
    const base = useId();
    if (faqs.length === 0) return null;
    return (
        <section aria-labelledby="bh-sss" className={cn(bhNarrow, 'flex flex-col gap-8 pb-16 sm:pb-24')}>
            <BhHeading id="bh-sss" title="Sık sorulanlar" />
            <div className="flex flex-col gap-3">
                {faqs.map((f, i) => {
                    const isOpen = open === i;
                    const id = `${base}-${f.key}`;
                    return (
                        <div key={f.key} className={cn('rounded-[26px] border transition-colors', isOpen ? 'border-transparent bg-[var(--site-alt)]' : 'border-[var(--site-border)] bg-[var(--site-card)]')}>
                            <h3 className="m-0">
                                <button type="button" aria-expanded={isOpen} aria-controls={id} onClick={() => setOpen(isOpen ? -1 : i)}
                                    className="flex min-h-16 w-full items-center justify-between gap-4 rounded-[26px] bg-transparent px-5 py-4 text-left text-[17px] font-bold text-[var(--site-text)] sm:px-6">
                                    <span>{f.q}</span>
                                    <span aria-hidden="true" className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--site-mustard)] text-[var(--site-text)] transition-transform duration-200 motion-reduce:transition-none', isOpen && 'rotate-45')}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                                    </span>
                                </button>
                            </h3>
                            {isOpen && <p id={id} className="m-0 px-5 pb-6 text-base leading-[1.7] text-[var(--site-sub)] sm:px-6">{f.a}</p>}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
