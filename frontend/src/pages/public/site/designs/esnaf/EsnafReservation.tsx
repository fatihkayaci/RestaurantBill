import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { canReserveOnline, formatDuration } from '@/features/customerSite/types';
import { RESERVATION_LOOKUP_PATH } from '@/features/customerSite/reservationCode';
import { cn } from '@/lib/utils';
import ReservationFlow from '../../ReservationFlow';
import { PageEmpty, SitePage } from '../../SiteFrame';
import { serif } from '../../siteParts';
import { telHref } from '../../siteTheme';
import { restaurantName, useMyReservations } from '../../useSite';
import { ExternalHint } from '../../siteEdit';
import { editExternal, useSiteEdit } from '../../siteEditContext';
import type { DesignPageProps } from '../registry';
import { reservationChoice } from '../meyhane/meyhaneParts';
import { OpenLine, PhoneGlyph, TileStrip } from './EsnafBits';
import { esButton, esLink, esSign, esWrap } from './esnafParts';

// Esnaf Tabelası rezervasyon sayfası: sade ve pratik. Tabela renginde "Masa ayırt" plakası, tek cümle açıklama ve
// bugünün saati; altında kuralların KISA ŞERİDİ (masada kalma, online en çok kaç kişi, kaç gün ileri: gerçek ayarlardan)
// ve rezervasyon akışı (ortak ReservationFlow) kalın çerçeveli tek panoda, ortada. Altında kalabalık sofra için büyük
// telefon satırı. Ana sayfadaki seçim ?tarih&saat&kisi ile gelir. Rezervasyon kapalıysa kısa bilgi ve telefon.

export default function EsnafReservation({ site }: DesignPageProps) {
    const { mine, add } = useMyReservations();
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const edit = useSiteEdit();
    const textX = editExternal(edit, 'reservationText');
    const name = restaurantName(site);
    const open = canReserveOnline(site);

    const hero = (
        <section aria-labelledby="es-rz" className="rb-es-sign bg-[var(--site-hero-bg)] text-[var(--site-on-cover)]">
            <div className={cn(esWrap, 'flex flex-col gap-5 pb-10 pt-10 sm:pt-14 lg:flex-row lg:items-end lg:justify-between lg:gap-12')}>
                <div className="flex min-w-0 flex-col gap-4">
                    <h1 id="es-rz" className={cn(esSign, 'text-[72px] sm:text-[112px] lg:text-[140px]')}>Masa ayırt</h1>
                    {open && (
                        <p {...textX} className={cn('m-0 max-w-[46ch] text-[18px] font-semibold leading-snug', textX.className)}>
                            Gün, saat ve kişi sayısını seçin; talebiniz restorana gider, onaylanınca masanız hazır.
                        </p>
                    )}
                </div>
                <div className="flex shrink-0 flex-col items-start gap-2">
                    <OpenLine site={site} className="text-[15px]" dotClassName="ring-2 ring-[var(--site-on-cover)]" />
                    {open && !edit && <Link to={RESERVATION_LOOKUP_PATH} className="inline-flex min-h-11 items-center text-[15px] font-extrabold uppercase tracking-[0.04em] text-[var(--site-on-cover)] underline decoration-[var(--site-pop)] decoration-[3px] underline-offset-[6px]">Rezervasyonumu sorgula</Link>}
                </div>
            </div>
            <TileStrip />
        </section>
    );

    if (!open) {
        return (
            <SitePage site={site} current="rezervasyon">
                <main className="flex flex-1 flex-col">
                    {hero}
                    <PageEmpty label="Rezervasyon" text="Online rezervasyon şu an alınmıyor.">
                        {site.phone && <a href={telHref(site.phone)} className={esButton.accent}><PhoneGlyph className="h-5 w-5" />Ara: {site.phone}</a>}
                    </PageEmpty>
                </main>
            </SitePage>
        );
    }

    const rules = site.reservation;
    const facts: { key: string; label: string; value: string }[] = [];
    if (rules.durationMinutes > 0) facts.push({ key: 'sure', label: 'Masada kalma', value: formatDuration(rules.durationMinutes) });
    if (rules.maxPartySize > 0) facts.push({ key: 'kisi', label: 'Online en çok', value: `${rules.maxPartySize} kişi` });
    if (rules.maxDaysAhead > 0) facts.push({ key: 'gun', label: 'İleri tarih', value: `${rules.maxDaysAhead} gün` });

    return (
        <SitePage site={site} current="rezervasyon">
            <main className="flex flex-1 flex-col">
                {hero}
                <ExternalHint source="reservation">
                    <div className="mx-auto flex w-full max-w-[880px] flex-col gap-8 px-4 pb-16 pt-8 sm:px-6 sm:pb-20 sm:pt-10">
                        {facts.length > 0 && (
                            <dl className={cn('m-0 grid gap-3', facts.length === 2 ? 'grid-cols-2' : facts.length === 3 && 'grid-cols-3')}>
                                {facts.map(f => (
                                    <div key={f.key} className="flex min-w-0 flex-col-reverse justify-end gap-1 rounded-md border-[3px] border-[var(--site-text)] bg-[var(--site-card)] px-3 py-3 sm:px-4">
                                        <dt className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--site-sub)] sm:text-xs">{f.label}</dt>
                                        <dd className={cn(serif, 'm-0 break-words text-[24px] leading-none sm:text-[32px]')}>{f.value}</dd>
                                    </div>
                                ))}
                            </dl>
                        )}
                        <div className="rb-es-board min-w-0 rounded-md p-2 leading-normal text-[var(--site-text)] sm:p-6">
                            <ReservationFlow
                                // Ana sayfadan yeni bir seçimle gelinirse akış o seçimle baştan kurulur.
                                key={params.toString()}
                                site={site}
                                restaurantName={name}
                                mine={mine}
                                onSent={add}
                                onClose={() => navigate('/')}
                                initial={reservationChoice(params)}
                                embedded
                            />
                        </div>
                        {site.phone && (
                            <p className="m-0 flex flex-col gap-2 border-t-[6px] border-[var(--site-text)] pt-5 sm:flex-row sm:items-center sm:justify-between">
                                <span className="text-[17px] font-bold">Daha kalabalık bir sofra ya da özel bir gün mü?</span>
                                <a href={telHref(site.phone)} className={cn(esLink, 'whitespace-nowrap')}>Arayın: {site.phone}</a>
                            </p>
                        )}
                    </div>
                </ExternalHint>
            </main>
        </SitePage>
    );
}
