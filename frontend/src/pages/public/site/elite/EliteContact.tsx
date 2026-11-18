import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { canReserveOnline, type PublicSite } from '@/features/customerSite/types';
import { useOnlineOrdering, useOnlineOrderingAvailable } from '@/features/delivery/useOnlineOrderingAvailable';
import {
    CONTACT_CONTACT_MAX, CONTACT_MESSAGE_MAX, CONTACT_MESSAGE_MIN, CONTACT_MESSAGE_TYPES, CONTACT_NAME_MAX,
} from '@/features/contactMessages/types';
import { cn } from '@/lib/utils';
import { SitePage } from '../SiteFrame';
import FaqEditorBox from '../FaqEditorBox';
import { visibleFaqs } from '../siteFaqs';
import { instagramHandle, untilTime } from '../siteParts';
import { directionsUrl, telHref, whatsappHref } from '../siteTheme';
import { fullAddress, weekSchedule } from '../useSite';
import { EditableBlock, EditableText, EmptySlot, ExternalHint } from '../siteEdit';
import { useSiteEdit } from '../siteEditContext';
import { useContactForm } from '../useContactForm';
import { EliteHero, EliteKicker } from './EliteBits';
import { elButton, elLabel, elSerif, elTitle, elWrap, heroLead } from './eliteParts';

// /iletisim, Elit (tasarım: EliteIletisim). (1) Tam genişlik kapak "Bize ulaşın." ve açık/kapalı satırı. (2) İnce
// çizgilerle ayrılan kanallar (Telefon, WhatsApp, Instagram; e-posta saklanmadığı için yok). (3) "Mesaj bırakın" formu
// (alt çizgili alanlar) + saatler (bugün vurgulu, paket siparişin son saati) ve adres. (4) Sık sorulanlar (ayarlardan
// oluşur; gizlenenler ve cevabı olmayanlar yok). Verisi olmayan parça çizilmez.

function timeOfDay(iso: string): string {
    return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

export default function EliteContact({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const c = site.site;
    const lead = <p className={heroLead}>Rezervasyon, özel gün ya da bir öneri; size en kolay gelen yoldan.</p>;
    return (
        <SitePage site={site} current="iletisim" overlayHeader>
            <main className="flex flex-1 flex-col bg-[var(--site-bg)] text-[var(--site-text)]">
                <EliteHero titleId="ilt-baslik" label="İletişim" title={<>Bize <em className="italic">ulaşın.</em></>} lead={lead}
                    image={c.contactHeroUrl || c.coverImageUrl} ownImage={Boolean(c.contactHeroUrl)}
                    imageTarget="photo:hero-iletisim" imageLabel="İletişim kapağı" emptyHint="+ İletişim kapağı seç">
                    {site.isOpenNow !== null && (
                        <EditableBlock target="hours" label="Çalışma saatleri">
                            <span className="inline-flex items-center gap-2.5 text-xs uppercase tracking-[0.22em]">
                                <span aria-hidden="true" className={cn('h-1.5 w-1.5 rounded-full', site.isOpenNow ? 'bg-[var(--site-dot-ok)]' : 'bg-[var(--site-dot-bad)]')} />
                                {site.isOpenNow ? 'Şu an açığız' : 'Şu an kapalıyız'}
                            </span>
                        </EditableBlock>
                    )}
                </EliteHero>
                <Channels site={site} />
                <section aria-label="Mesaj ve ziyaret" className="bg-[var(--site-bg)]">
                    <div className={cn(elWrap, 'flex max-w-[1240px] flex-wrap gap-x-24 gap-y-16 pb-20 pt-16 md:pb-[120px] md:pt-20')}>
                        {!edit && (
                            <ExternalHint source="messages">
                                <div className="min-w-0 flex-[999_1_560px]"><EliteContactForm branchId={site.branchId} phone={site.phone || undefined} /></div>
                            </ExternalHint>
                        )}
                        <div className="flex min-w-0 flex-[1_1_340px] flex-col gap-14">
                            <Hours site={site} />
                            <Address site={site} />
                        </div>
                    </div>
                </section>
                {edit ? <div className={cn(elWrap, 'pb-16')}><FaqEditorBox site={site} /></div> : <Faq site={site} />}
            </main>
        </SitePage>
    );
}

// ── Kanallar ─────────────────────────────────────────────────────────────────────────────────────

function Channel({ href, external, label, value, note }: { href: string; external?: boolean; label: string; value: string; note?: string }) {
    return (
        <a href={href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}
            className="flex h-full min-w-0 flex-col gap-3 py-8 text-[var(--site-text)] no-underline transition-opacity hover:opacity-75 md:py-0 md:pt-9">
            <span className={cn(elLabel, 'text-[11px] text-[var(--site-accent-text)]')}>{label}</span>
            <span className={cn(elSerif, 'break-words text-[26px] leading-[1.15] md:text-[28px]')}>{value}</span>
            {note && <span className="text-[13px] text-[var(--site-muted)]">{note}</span>}
        </a>
    );
}

function Channels({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const showEmpty = Boolean(edit?.showEmpty);
    const canOrder = useOnlineOrderingAvailable();
    const c = site.site;
    const cells: ReactNode[] = [];
    // Telefonun notu yalnız gerçekten açık olanları söyler.
    const phoneNote = [canReserveOnline(site) && 'Rezervasyon', canOrder && 'paket sipariş'].filter(Boolean).join(' ve ');
    if (site.phone && !edit) {
        cells.push(<ExternalHint key="tel" source="restaurant"><Channel href={telHref(site.phone)} label="Telefon" value={site.phone} note={phoneNote ? phoneNote.charAt(0).toLocaleUpperCase('tr-TR') + phoneNote.slice(1) : undefined} /></ExternalHint>);
    }
    if (c.whatsappPhone) {
        cells.push(<EditableBlock key="wa" target="contact" label="WhatsApp"><Channel href={whatsappHref(c.whatsappPhone)} external label="WhatsApp" value={c.whatsappPhone} /></EditableBlock>);
    } else if (showEmpty) cells.push(<div key="wa" className="pt-8"><EmptySlot target="contact" title="+ WhatsApp ekle" className="min-h-[64px]" /></div>);
    if (c.instagramUrl) {
        cells.push(<EditableBlock key="ig" target="contact" label="Instagram"><Channel href={c.instagramUrl} external label="Instagram" value={instagramHandle(c.instagramUrl)} /></EditableBlock>);
    } else if (showEmpty) cells.push(<div key="ig" className="pt-8"><EmptySlot target="contact" title="+ Instagram ekle" className="min-h-[64px]" /></div>);
    if (cells.length === 0) return null;
    return (
        <section aria-label="İletişim kanalları" className="bg-[var(--site-bg)]">
            <div className={cn(elWrap, 'max-w-[1240px] pt-20 md:pt-[120px]')}>
                <div className="grid grid-cols-1 divide-y divide-[color-mix(in_srgb,var(--site-text)_18%,transparent)] border-t border-[color-mix(in_srgb,var(--site-text)_18%,transparent)] md:grid-cols-[repeat(auto-fit,minmax(240px,1fr))] md:divide-y-0 md:[&>*+*]:border-l md:[&>*+*]:pl-7 md:[&>*]:pr-7">
                    {cells.map((cell, i) => <div key={i} className="min-w-0 border-[color-mix(in_srgb,var(--site-text)_18%,transparent)]">{cell}</div>)}
                </div>
            </div>
        </section>
    );
}

// ── Saatler + adres ──────────────────────────────────────────────────────────────────────────────

function Hours({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const ordering = useOnlineOrdering();
    const rows = weekSchedule(site);
    if (!rows) return edit?.showEmpty ? <EmptySlot target="hours" title="+ Çalışma saatlerini ekle" /> : null;
    const lastOrder = ordering?.state === 'open' && ordering.lastOrderAt ? timeOfDay(ordering.lastOrderAt) : null;
    const row = 'flex justify-between gap-4 border-b border-[color-mix(in_srgb,var(--site-text)_12%,transparent)] py-2.5 text-sm tracking-[0.03em]';
    return (
        <EditableBlock target="hours" label="Çalışma saatleri">
            <section id="saatler" aria-labelledby="ilt-saat" className="flex scroll-mt-24 flex-col gap-5 lg:scroll-mt-28">
                <h2 id="ilt-saat" className="m-0"><EliteKicker>Saatler</EliteKicker></h2>
                <dl className="m-0 flex flex-col">
                    {rows.map(r => (
                        <div key={r.day} className={cn(row, r.isToday ? 'font-medium text-[var(--site-text)]' : 'text-[var(--site-sub)]')}>
                            <dt>{r.label}{r.isToday && <span className="text-[var(--site-accent-text)]"> · bugün</span>}</dt>
                            <dd className="m-0 tabular-nums">{r.text}</dd>
                        </div>
                    ))}
                    {lastOrder && !edit && (
                        <div className={cn(row, 'text-[var(--site-sub)]')}><dt>Paket sipariş</dt><dd className="m-0 tabular-nums">{untilTime(lastOrder)}</dd></div>
                    )}
                </dl>
                {site.site.hoursNote && <p className="m-0 text-[13px] leading-relaxed text-[var(--site-muted)]">{site.site.hoursNote}</p>}
            </section>
        </EditableBlock>
    );
}

function Address({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const showEmpty = Boolean(edit?.showEmpty);
    const address = fullAddress(site);
    const note = site.site.directionsNote;
    const showAddress = Boolean(address) && !edit;
    if (!showAddress && !note && !showEmpty) return null;
    return (
        <section aria-labelledby="ilt-adres" className="flex flex-col gap-4">
            <h2 id="ilt-adres" className="m-0"><EliteKicker>Adres</EliteKicker></h2>
            {showAddress && (
                <ExternalHint source="restaurant">
                    <p className={cn(elSerif, 'm-0 break-words text-[24px] leading-[1.35]')}>
                        {site.openAddress || address}
                        {site.openAddress && (site.district || site.city) && <><br />{[site.district, site.city].filter(Boolean).join(', ')}</>}
                    </p>
                </ExternalHint>
            )}
            {(note || showEmpty) && (
                <EditableText as="p" field="directionsNote" value={note} multiline placeholder="Nasıl gelinir? (kısa tarif)"
                    className="m-0 whitespace-pre-line text-[15px] leading-relaxed text-[var(--site-sub)]" />
            )}
            {!edit && (
                <div className="flex flex-wrap gap-x-6">
                    {showAddress && <a href={directionsUrl(address)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center border-b border-[var(--site-text)] text-[11px] uppercase tracking-[0.28em] text-[var(--site-text)] no-underline">Yol tarifi →</a>}
                    <Link to="/mekan#konum" className="inline-flex min-h-11 items-center border-b border-transparent text-[11px] uppercase tracking-[0.28em] text-[var(--site-text)] no-underline hover:border-[var(--site-text)]">Nasıl gelinir?</Link>
                </div>
            )}
        </section>
    );
}

// ── Mesaj formu ──────────────────────────────────────────────────────────────────────────────────

const fieldLabel = cn(elLabel, 'flex flex-col gap-2 text-[11px] text-[var(--site-muted)]');
const input = cn(elSerif, 'w-full border-0 border-b border-[color-mix(in_srgb,var(--site-text)_35%,transparent)] bg-transparent p-0 text-[22px] normal-case tracking-normal text-[var(--site-text)] outline-none transition-colors placeholder:text-[var(--site-muted)] focus:border-[var(--site-text)]');

function EliteContactForm({ branchId, phone }: { branchId: string; phone?: string }) {
    const {
        name, setName, contact, setContact, type, setType, message, setMessage, consent, setConsent, website, setWebsite,
        sending, error, sent, submit, reset,
    } = useContactForm(branchId);

    if (sent) {
        return (
            <div role="status" className="rb-el-belir-hizli flex min-h-[420px] flex-col justify-center gap-[22px]">
                <EliteKicker>Mesajınız ulaştı</EliteKicker>
                <h2 className={cn(elSerif, 'm-0 text-[44px] leading-[1.02] md:text-[56px]')}>Teşekkür ederiz,<br /><em className="italic">okuyacağız.</em></h2>
                <p className="m-0 max-w-[460px] text-base leading-relaxed text-[var(--site-sub)]">Restoran ekibi mesajınızı okuyacak; iletişim bilgisi bıraktıysanız size dönüş yapılabilir.</p>
                <button type="button" onClick={reset} className="inline-flex min-h-11 items-center self-start border-b border-[var(--site-text)] bg-transparent text-xs uppercase tracking-[0.3em] text-[var(--site-text)]">Yeni mesaj</button>
            </div>
        );
    }

    return (
        <form onSubmit={submit} noValidate className="relative flex min-w-0 flex-col gap-9" aria-labelledby="ilt-form-baslik" aria-describedby={error ? 'ilt-form-hata' : undefined}>
            <div className="flex flex-col gap-[18px]">
                <EliteKicker>Mesaj bırakın</EliteKicker>
                <h2 id="ilt-form-baslik" className={cn(elTitle, 'md:text-[clamp(40px,4vw,60px)] md:leading-[1.05]')}>Size <em className="italic">dönelim.</em></h2>
            </div>
            <fieldset className="m-0 min-w-0 border-0 p-0">
                <legend className="sr-only">Konu</legend>
                <div className="flex flex-wrap gap-x-[30px] border-b border-[color-mix(in_srgb,var(--site-text)_15%,transparent)]">
                    {CONTACT_MESSAGE_TYPES.map(option => {
                        const on = type === option.value;
                        return (
                            <label key={option.value}
                                className={cn('flex min-h-12 cursor-pointer items-center border-b-2 text-[11px] font-medium uppercase tracking-[0.26em] transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--site-text)]',
                                    on ? 'border-[var(--site-accent-text)] text-[var(--site-text)]' : 'border-transparent text-[var(--site-muted)] hover:text-[var(--site-text)]')}>
                                <input type="radio" name="ilt-tur" value={option.value} checked={on} onChange={() => setType(option.value)} className="sr-only" />
                                {option.label}
                            </label>
                        );
                    })}
                </div>
            </fieldset>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-x-9 gap-y-7">
                <label className={fieldLabel}>Ad soyad
                    <input value={name} onChange={e => setName(e.target.value)} required maxLength={CONTACT_NAME_MAX} autoComplete="name" className={cn(input, 'h-[50px]')} />
                </label>
                <label className={fieldLabel}>
                    <span>Telefon ya da e-posta <span className="normal-case tracking-[0.04em]">(isteğe bağlı)</span></span>
                    <input value={contact} onChange={e => setContact(e.target.value)} maxLength={CONTACT_CONTACT_MAX} autoComplete="tel" className={cn(input, 'h-[50px]')} />
                </label>
            </div>
            <label className={fieldLabel}>Mesajınız
                <textarea value={message} onChange={e => setMessage(e.target.value)} required minLength={CONTACT_MESSAGE_MIN} maxLength={CONTACT_MESSAGE_MAX} rows={4}
                    placeholder="Önerinizi, şikâyetinizi ya da sorunuzu yazın" className={cn(input, 'resize-y py-3 text-xl leading-[1.5]')} />
                <span className="self-end text-[11px] normal-case tracking-[0.04em] tabular-nums">{message.length} / {CONTACT_MESSAGE_MAX}</span>
            </label>
            {/* Bal küpü: ekranda ve okuyucuda görünmez, insan doldurmaz. */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
                <label>
                    Web sitesi
                    <input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} />
                </label>
            </div>
            <label className="flex min-h-11 cursor-pointer items-start gap-3 text-[13px] leading-[1.6] text-[var(--site-sub)]">
                <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} required className="m-0 mt-0.5 h-[18px] w-[18px] shrink-0 accent-[var(--site-paper)]" />
                <span>
                    <Link to="/gizlilik-politikasi" target="_blank" className="font-medium text-[var(--site-text)] underline underline-offset-2">KVKK aydınlatma metnini</Link> okudum;
                    bana bu konu hakkında dönüş yapılmasını kabul ediyorum.
                </span>
            </label>
            {error && <p id="ilt-form-hata" role="alert" className="m-0 border-l-2 border-[var(--site-error)] bg-[var(--site-error-bg)] px-4 py-3 text-sm font-medium text-[var(--site-error)]">{error}</p>}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <button type="submit" disabled={sending} className={cn(elButton.dark, 'disabled:cursor-not-allowed disabled:opacity-60 md:min-h-[58px] md:px-11')}>
                    {sending ? 'Gönderiliyor…' : 'Gönder'}
                </button>
                {phone && <span className="text-[13px] text-[var(--site-muted)]">Acil mi? <a href={telHref(phone)} className="inline-flex min-h-11 items-center font-medium text-[var(--site-text)] underline-offset-2 hover:underline">Hemen arayın</a></span>}
            </div>
        </form>
    );
}

// ── Sık sorulanlar ───────────────────────────────────────────────────────────────────────────────

function Faq({ site }: { site: PublicSite }) {
    const faqs = visibleFaqs(site, useOnlineOrdering());
    const [open, setOpen] = useState(0);
    if (faqs.length === 0) return null;
    return (
        <section aria-labelledby="ilt-sss" className="bg-[var(--site-alt)]">
            <div className={cn(elWrap, 'flex max-w-[1240px] flex-wrap gap-x-24 gap-y-10 py-20 md:py-[130px]')}>
                <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-5 md:max-w-[380px]">
                    <EliteKicker>Sık sorulanlar</EliteKicker>
                    <h2 id="ilt-sss" className={cn(elTitle, 'md:text-[clamp(40px,4vw,56px)] md:leading-[1.05]')}>Aklınıza takılan <em className="italic">bir şey mi var?</em></h2>
                </div>
                <div className="min-w-0 flex-[999_1_520px] border-t border-[color-mix(in_srgb,var(--site-text)_18%,transparent)]">
                    {faqs.map((f, i) => {
                        const isOpen = open === i;
                        const id = `sss-${f.key}`;
                        return (
                            <div key={f.key} className="border-b border-[color-mix(in_srgb,var(--site-text)_18%,transparent)]">
                                <button type="button" aria-expanded={isOpen} aria-controls={id} onClick={() => setOpen(isOpen ? -1 : i)}
                                    className="flex w-full items-center justify-between gap-4 bg-transparent py-[22px] text-left text-[var(--site-text)]">
                                    <span className={cn(elSerif, 'text-[21px] leading-[1.25] md:text-[22px]')}>{f.q}</span>
                                    <span aria-hidden="true" className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl font-light transition-transform duration-300 motion-reduce:transition-none',
                                        isOpen ? 'rotate-45 bg-[var(--site-paper)] text-[var(--site-accent-on-dark)]' : 'border border-[color-mix(in_srgb,var(--site-text)_25%,transparent)]')}>+</span>
                                </button>
                                {isOpen && <p id={id} className={cn('rb-el-belir-hizli m-0 pb-[22px] pr-0 text-[15px] leading-[1.8] text-[var(--site-sub)] md:pr-14')}>{f.a}</p>}
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

