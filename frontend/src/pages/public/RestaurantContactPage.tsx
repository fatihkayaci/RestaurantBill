import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { PublicSite } from '@/features/customerSite/types';
import { useOnlineOrdering } from '@/features/delivery/useOnlineOrderingAvailable';
import { cn } from '@/lib/utils';
import { SiteShell, SiteStatus } from './site/SiteChrome';
import { SitePage } from './site/SiteFrame';
import { instagramHandle, serif, untilTime } from './site/siteParts';
import { directionsUrl, telHref, whatsappHref } from './site/siteTheme';
import { fullAddress, useSite, weekSchedule } from './site/useSite';
import ContactForm from './site/ContactForm';
import { faqItems, visibleFaqs } from './site/siteFaqs';
import { EditableBlock, EditableText, EmptySlot, ExternalHint } from './site/siteEdit';
import { useSiteEdit } from './site/siteEditContext';
import { oliveBg } from './site/renkliTones';

// /iletisim (tasarım: "Renkli ve sıcak — İletişim"). Kum sayfada yuvarlak kutular: (1) hardal kapak: solda "Bize ulaşın."
// ve açık/kapalı hapı, sağda her gerçek kanal için bütün satırı bağlantı olan liste (Telefon, WhatsApp, Instagram; e-posta
// saklanmadığı için yok). (2) Krem "Mesaj bırakın" formu (mevcut iletişim mesajı ucu) + sağda zeytin çalışma saatleri kutusu
// (bugün vurgulu, paket siparişin son saati) ve süs haritalı adres kutusu. Verisi olmayan kutu ya da satır çizilmez.

const box = 'rounded-[24px] bg-[var(--site-card)] text-[var(--site-text)] md:rounded-[32px]';

function timeOfDay(iso: string): string {
    return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

const ICONS = {
    phone: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z',
    whatsapp: 'M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.4A8.4 8.4 0 1 1 21 11.5z',
    instagram: 'M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zM16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37zM17.5 6.5h.01',
};

/** Kanal satırı: 56 px ikon dairesi, küçük etiket, büyük serif değer, (varsa) kısa not ve ok dairesi; bütün satır bağlantı. */
function ChannelRow({ href, external, label, value, note, icon, main = false }: {
    href: string; external?: boolean; label: string; value: string; note?: string; icon: string; main?: boolean;
}) {
    return (
        <a href={href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}
            className="flex items-center gap-4 border-b border-[rgba(36,24,15,0.18)] py-5 text-[var(--site-text)] no-underline transition-opacity hover:opacity-80 sm:gap-5 sm:py-6">
            <span aria-hidden="true" className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-full sm:h-14 sm:w-14',
                main ? 'bg-[var(--site-accent)] text-[var(--site-on-accent)]' : 'bg-[var(--site-card)] text-[var(--site-text)]')}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={icon} /></svg>
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#4A3A2C]">{label}</span>
                <span className={cn(serif, 'break-words text-[22px] font-semibold leading-[1.1] min-[400px]:text-[26px] sm:text-[clamp(28px,2.6vw,40px)]')}>{value}</span>
            </span>
            {note && <span className="hidden max-w-[180px] shrink-0 text-right text-[13px] text-[#4A3A2C] md:block">{note}</span>}
            <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--site-paper)] text-[var(--site-on-paper)] sm:h-12 sm:w-12">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M8 7h9v9" /></svg>
            </span>
        </a>
    );
}

function Channels({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const showEmpty = Boolean(edit?.showEmpty);
    const c = site.site;
    const rows: ReactNode[] = [];
    if (site.phone && !edit) {
        rows.push(
            <ExternalHint key="tel" source="restaurant">
                <ChannelRow href={telHref(site.phone)} label="Telefon" value={site.phone} note="Rezervasyon ve paket sipariş" icon={ICONS.phone} main />
            </ExternalHint>,
        );
    }
    if (c.whatsappPhone) {
        rows.push(
            <EditableBlock key="wa" target="contact" label="WhatsApp">
                <ChannelRow href={whatsappHref(c.whatsappPhone)} external label="WhatsApp" value={c.whatsappPhone} icon={ICONS.whatsapp} />
            </EditableBlock>,
        );
    } else if (showEmpty) rows.push(<EmptySlot key="wa" target="contact" title="+ WhatsApp ekle" className="my-3 min-h-[64px]" />);
    if (c.instagramUrl) {
        rows.push(
            <EditableBlock key="ig" target="contact" label="Instagram">
                <ChannelRow href={c.instagramUrl} external label="Instagram" value={instagramHandle(c.instagramUrl)} icon={ICONS.instagram} />
            </EditableBlock>,
        );
    } else if (showEmpty) rows.push(<EmptySlot key="ig" target="contact" title="+ Instagram ekle" className="my-3 min-h-[64px]" />);
    if (rows.length === 0) return null;
    return <div className="flex min-w-0 flex-[999_1_560px] flex-col">{rows}</div>;
}

/** Zeytin çalışma saatleri kutusu: gün gün (bugün vurgulu), açık/kapalı rozeti, not ve paket siparişin son saati. */
function HoursBox({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const ordering = useOnlineOrdering();
    const rows = weekSchedule(site);
    if (!rows) return edit?.showEmpty ? <EmptySlot target="hours" title="+ Çalışma saatlerini ekle" /> : null;
    const lastOrder = ordering?.state === 'open' && ordering.lastOrderAt ? timeOfDay(ordering.lastOrderAt) : null;
    return (
        <EditableBlock target="hours" label="Çalışma saatleri" className="rounded-[24px] md:rounded-[32px]">
            <section id="saatler" aria-labelledby="ilt-saat" className={cn(oliveBg, 'flex scroll-mt-24 flex-col gap-4 rounded-[24px] p-6 text-[var(--site-on-paper)] sm:p-9 md:rounded-[32px]')}>
                <div className="flex items-center justify-between gap-3">
                    <h2 id="ilt-saat" className={cn(serif, 'm-0 text-[32px] leading-none sm:text-[36px]')}>Çalışma saatleri</h2>
                    {site.isOpenNow !== null && (
                        <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-extrabold">
                            <span aria-hidden="true" className={cn('h-[7px] w-[7px] rounded-full', site.isOpenNow ? 'bg-[#4ADE80]' : 'bg-[#F87171]')} />
                            {site.isOpenNow ? 'Açık' : 'Kapalı'}
                        </span>
                    )}
                </div>
                <dl className="m-0 flex flex-col">
                    {rows.map(r => (
                        <div key={r.day} className={cn('-mx-3 flex justify-between gap-4 rounded-[10px] px-3 py-2 text-[15px]',
                            r.isToday ? 'bg-[rgba(251,244,232,0.12)] font-extrabold' : 'text-[var(--site-on-paper-sub)]')}>
                            <dt>{r.label}{r.isToday && ' · bugün'}</dt>
                            <dd className="m-0 tabular-nums">{r.text}</dd>
                        </div>
                    ))}
                </dl>
                {site.site.hoursNote && <p className="m-0 text-sm text-[var(--site-on-paper-sub)]">{site.site.hoursNote}</p>}
                {lastOrder && !edit && (
                    <div className="flex justify-between gap-4 border-t border-dashed border-[rgba(251,244,232,0.22)] pt-3 text-sm">
                        <span className="text-[var(--site-on-paper-sub)]">Paket sipariş</span>
                        <span className="font-extrabold">{untilTime(lastOrder)}</span>
                    </div>
                )}
            </section>
        </EditableBlock>
    );
}

/** Adres kutusu: süs harita (tıklayınca Google Haritalar), adres, "nasıl gelinir" notu ve Mekân sayfasına bağlantı. */
function AddressBox({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const showEmpty = Boolean(edit?.showEmpty);
    const address = fullAddress(site);
    const note = site.site.directionsNote;
    const showAddress = Boolean(address) && !edit;
    if (!showAddress && !note && !showEmpty) return null;
    return (
        <section aria-labelledby="ilt-adres" className={cn(box, 'flex flex-1 flex-col overflow-hidden')}>
            {showAddress && (
                <ExternalHint source="restaurant">
                    <a href={directionsUrl(address)} target="_blank" rel="noopener noreferrer" aria-label="Haritada aç"
                        className="relative block min-h-[180px] flex-1 overflow-hidden bg-[#ECE4D7] bg-[linear-gradient(rgba(36,24,15,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(36,24,15,0.05)_1px,transparent_1px)] bg-[length:30px_30px] transition-opacity hover:opacity-90">
                        <span aria-hidden="true" className="absolute -left-[10%] -right-[10%] top-[46%] h-3 -rotate-[8deg] bg-[#FBF8F3]" />
                        <span aria-hidden="true" className="absolute -bottom-[10%] -top-[10%] left-[62%] w-[9px] rotate-[14deg] bg-[#FBF8F3]" />
                        <span aria-hidden="true" className="absolute right-0 top-0 h-1/2 w-[32%] rounded-bl-[90px] bg-[#CBDAD3]" />
                        <span aria-hidden="true" className="absolute left-[44%] top-[44%] h-[22px] w-[22px] rounded-full border-4 border-white bg-[var(--site-accent)] shadow-[0_4px_12px_rgba(0,0,0,0.25)]" />
                    </a>
                </ExternalHint>
            )}
            <div className="flex flex-col gap-2.5 px-6 pb-7 pt-6 sm:px-7">
                <h2 id="ilt-adres" className="m-0 text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--site-muted)]">Adres</h2>
                {showAddress && (
                    <p className={cn(serif, 'm-0 break-words text-[26px] font-semibold leading-[1.15]')}>
                        {site.openAddress || address}
                        {site.openAddress && (site.district || site.city) && <><br />{[site.district, site.city].filter(Boolean).join(' / ')}</>}
                    </p>
                )}
                {(note || showEmpty) && (
                    <EditableText as="p" field="directionsNote" value={note} multiline placeholder="Nasıl gelinir? (kısa tarif)"
                        className="m-0 whitespace-pre-line text-[15px] leading-relaxed text-[var(--site-sub)]" />
                )}
                {!edit && (
                    <Link to="/mekan#konum" className="inline-flex min-h-11 items-center self-start text-sm font-extrabold text-[var(--site-text)] no-underline hover:underline">Nasıl gelinir? →</Link>
                )}
            </div>
        </section>
    );
}

// ── Sık sorulanlar ───────────────────────────────────────────────────────────────────────────────
// Hazır sorular (site/siteFaqs.ts): cevaplar restoranın ayarlarından oluşur; restoranın gizlediği ve cevabı olmayan
// soru çizilmez. Hiç soru yoksa bölüm yok. Düzenleyicide bunun yerine aç/kapa listesi (FaqEditorBox).

function FaqSection({ site }: { site: PublicSite }) {
    const faqs = visibleFaqs(site, useOnlineOrdering());
    const [open, setOpen] = useState(0);
    if (faqs.length === 0) return null;
    return (
        <section aria-labelledby="ilt-sss" className={cn(box, 'flex flex-wrap gap-x-[72px] gap-y-8 p-6 sm:p-10 md:p-14')}>
            <div className="flex min-w-0 max-w-[360px] flex-[1_1_280px] flex-col gap-3">
                <span className="text-xs font-extrabold uppercase tracking-[0.24em] text-[var(--site-accent-text)]">Sık sorulanlar</span>
                <h2 id="ilt-sss" className={cn(serif, 'm-0 text-[40px] font-bold leading-[0.98] md:text-[52px]')}>Aklınıza takılan bir şey mi var?</h2>
            </div>
            <div className="flex min-w-0 flex-[999_1_520px] flex-col">
                {faqs.map((f, i) => {
                    const isOpen = open === i;
                    const id = `sss-${f.key}`;
                    return (
                        <div key={f.key} className="border-b border-[rgba(36,24,15,0.12)]">
                            <button type="button" aria-expanded={isOpen} aria-controls={id} onClick={() => setOpen(isOpen ? -1 : i)}
                                className="flex w-full items-center justify-between gap-4 bg-transparent py-5 text-left text-[var(--site-text)] md:py-6">
                                <span className={cn(serif, 'text-[22px] font-semibold leading-[1.15] md:text-[28px]')}>{f.q}</span>
                                <span aria-hidden="true" className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl transition-transform duration-200 motion-reduce:transition-none',
                                    isOpen ? 'rotate-45 bg-[var(--site-terracotta,#A9401F)] text-[var(--site-on-terracotta,#FBF4E8)]' : 'border border-[rgba(36,24,15,0.18)]')}>+</span>
                            </button>
                            {isOpen && <p id={id} className="m-0 pb-6 pr-0 text-base leading-[1.7] text-[#5A4A3C] md:pr-16">{f.a}</p>}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

/**
 * Yalnız düzenleyicide: bütün hazır sorular. Şu an geçerli olanların yanında aç/kapa anahtarı (kapatılan, taslağın
 * hiddenFaqs listesine yazılır; Yayınla'ya kadar müşteri sitesi değişmez); geçerli olmayanlar soluk ve nedeniyle.
 */
function FaqEditorBox({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const items = faqItems(site, useOnlineOrdering());
    if (!edit) return null;
    const hidden = new Set(site.site.hiddenFaqs ?? []);
    const live = items.filter(f => f.a !== null);
    const waiting = items.filter(f => f.a === null);
    return (
        <section aria-labelledby="ilt-sss-ed" className={cn(box, 'flex flex-col gap-5 p-6 sm:p-10')}>
            <div className="flex flex-col gap-1.5">
                <h2 id="ilt-sss-ed" className={cn(serif, 'm-0 text-[34px] font-bold leading-none md:text-[40px]')}>Sık sorulanlar</h2>
                <p className="m-0 font-[family-name:'DM_Sans',system-ui,sans-serif] text-sm text-[var(--site-sub)]">
                    Sorular ve cevaplar ayarlarınızdan kendiliğinden oluşur. İstemediğinizi kapatın; değişiklik Yayınla'dan sonra sitede görünür.
                </p>
            </div>
            <ul className="m-0 flex list-none flex-col p-0">
                {live.map(f => {
                    const on = !hidden.has(f.key);
                    return (
                        <li key={f.key} className="flex items-start gap-4 border-b border-[var(--site-line)] py-4">
                            <div className={cn('min-w-0 flex-1', !on && 'opacity-55')}>
                                <p className="m-0 font-bold">{f.q}</p>
                                <p className="m-0 mt-1 text-sm leading-relaxed text-[var(--site-sub)]">{f.a}</p>
                            </div>
                            <button type="button" role="switch" aria-checked={on} aria-label={`${f.q} ${on ? 'sitede görünüyor' : 'gizli'}`}
                                onClick={() => edit.toggleFaq?.(f.key)}
                                className="flex h-11 shrink-0 items-center gap-2 rounded-full px-1 font-[family-name:'DM_Sans',system-ui,sans-serif] text-sm font-semibold">
                                <span aria-hidden="true" className={cn('relative h-6 w-11 rounded-full transition-colors', on ? 'bg-[#2B7FFF]' : 'bg-[#CFC5B4]')}>
                                    <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left]', on ? 'left-[22px]' : 'left-0.5')} />
                                </span>
                                <span className="w-12 text-left">{on ? 'Açık' : 'Gizli'}</span>
                            </button>
                        </li>
                    );
                })}
            </ul>
            {waiting.length > 0 && (
                <div className="flex flex-col gap-2">
                    <p className="m-0 font-[family-name:'DM_Sans',system-ui,sans-serif] text-xs font-bold uppercase tracking-[0.14em] text-[var(--site-muted)]">Şu an görünmeyenler</p>
                    <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                        {waiting.map(f => (
                            <li key={f.key} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 text-sm text-[var(--site-muted)]">
                                <span className="font-semibold">{f.q}</span>
                                <span className="font-[family-name:'DM_Sans',system-ui,sans-serif] text-[13px]">{f.reason}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
}

export default function RestaurantContactPage() {
    const { site, error } = useSite();
    const edit = useSiteEdit();
    if (!site) return <SiteShell><SiteStatus error={error} /></SiteShell>;

    return (
        <SitePage site={site} current="iletisim">
            <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-4 px-2 pb-4 pt-4 sm:px-4">
                {/* 1. Kanallar */}
                <section aria-labelledby="ilt-baslik" className={cn(box, 'flex flex-wrap gap-x-[72px] gap-y-8 bg-[var(--site-mustard)] p-6 sm:p-10 md:p-14 [--site-accent-text:var(--site-story)]')}>
                    <div className="flex min-w-0 flex-[1_1_360px] flex-col justify-between gap-7">
                        <div className="flex flex-col gap-5">
                            <span className="inline-flex items-center gap-2.5 text-xs font-extrabold uppercase tracking-[0.24em] text-[var(--site-text)]">
                                <span aria-hidden="true" className="h-0.5 w-7 shrink-0 bg-[var(--site-text)]" />İletişim
                            </span>
                            <h1 id="ilt-baslik" className={cn(serif, 'm-0 text-[64px] font-extrabold leading-[0.88] md:text-[clamp(64px,7vw,112px)]')}>Bize<br /><em className="rb-accent italic">ulaşın.</em></h1>
                            <p className="m-0 max-w-[420px] text-base leading-[1.65] text-[#3A2A1C] md:text-[17px]">Rezervasyon, paket sipariş, özel gün ya da bir öneri… Size en kolay gelen yoldan yazın, arayın.</p>
                        </div>
                        {site.isOpenNow !== null && (
                            <EditableBlock target="hours" label="Çalışma saatleri" className="self-start rounded-full">
                                <span className="inline-flex items-center gap-2.5 self-start rounded-full bg-[var(--site-bg)] px-[18px] py-3 text-sm">
                                    <span aria-hidden="true" className={cn('h-2 w-2 rounded-full', site.isOpenNow ? 'bg-[#22A35A] shadow-[0_0_0_4px_#DDF3E6]' : 'bg-[#C8472C] shadow-[0_0_0_4px_#FBE3DC]')} />
                                    <strong>{site.isOpenNow ? 'Şu an açığız' : 'Şu an kapalıyız'}</strong>
                                </span>
                            </EditableBlock>
                        )}
                    </div>
                    <Channels site={site} />
                </section>

                {/* 2. Form + saatler/adres */}
                <div className="flex flex-wrap items-stretch gap-4">
                    {!edit && (
                        <ExternalHint source="messages">
                            <section aria-label="Mesaj formu" className={cn(box, 'min-w-0 flex-[999_1_620px] p-6 sm:p-10 md:p-12')}>
                                <ContactForm branchId={site.branchId} phone={site.phone || undefined} />
                            </section>
                        </ExternalHint>
                    )}
                    <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-4">
                        <HoursBox site={site} />
                        <AddressBox site={site} />
                    </div>
                </div>

                {/* 3. Sık sorulanlar (ayarlardan oluşur; düzenleyicide aç/kapa listesi) */}
                {edit ? <FaqEditorBox site={site} /> : <FaqSection site={site} />}
            </main>
        </SitePage>
    );
}
