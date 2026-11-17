import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { canReserveOnline } from '@/features/customerSite/types';
import { RESERVATION_LOOKUP_PATH } from '@/features/customerSite/reservationCode';
import { cn } from '@/lib/utils';
import ReservationFlow from './site/ReservationFlow';
import { SiteShell, SiteStatus } from './site/SiteChrome';
import { PageEmpty, SitePage } from './site/SiteFrame';
import { ReservationHero } from './site/ReservationHero';
import { heroOutlineLink } from './site/renkliTones';
import { resolveDesign, telHref } from './site/siteTheme';
import { EliteReservationHero } from './site/elite/EliteFlowParts';
import { restaurantName, useMyReservations, useSite } from './site/useSite';
import { ExternalHint } from './site/siteEdit';
import { editExternal, useSiteEdit } from './site/siteEditContext';

// /rezervasyon (tasarım: "Renkli · Masa ayırt"): koyu kapak ("Masanızı ayırtın.", sorgulama bağlantısı) ve altında tam
// rezervasyon akışı (ortak başlık ve alt bilgiyle). Ana sayfadaki hızlı seçici seçimi ?tarih=2026-11-14&saat=19:00&kisi=2
// ile gelir. Rezervasyon kapalıysa kısa bir bilgi sayfası.

const main = 'mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-4 px-2 pb-4 pt-4 sm:px-4';
export default function RestaurantReservationPage() {
    const { site, error } = useSite();
    const { mine, add } = useMyReservations();
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const edit = useSiteEdit();
    const textX = editExternal(edit, 'reservationText');

    if (!site) return <SiteShell><SiteStatus error={error} /></SiteShell>;

    const name = restaurantName(site);
    // Elit: tam genişlik fotoğraf kapağı (üst menü üstünde saydam); akış altında krem zeminde.
    const elit = resolveDesign(site.site.design) === 'elit';

    if (!canReserveOnline(site)) {
        return (
            <SitePage site={site} current="rezervasyon" overlayHeader={elit}>
                <main className={elit ? 'flex flex-1 flex-col' : main}>
                    {elit ? <EliteReservationHero site={site} />
                        : <ReservationHero site={site} kicker={`${name} · Rezervasyon`} title="Masanızı" accent="ayırtın." />}
                    <div className={elit ? '' : 'rounded-[24px] bg-[var(--site-card)] md:rounded-[36px]'}>
                        <PageEmpty label="Rezervasyon" text="Online rezervasyon şu an alınmıyor.">
                            {site.phone && (
                                <p className="m-0 text-[var(--site-sub)]">
                                    Masa ayırtmak için bizi arayın: <a href={telHref(site.phone)} className="inline-flex min-h-11 items-center whitespace-nowrap font-bold text-[var(--site-text)]">{site.phone}</a>
                                </p>
                            )}
                        </PageEmpty>
                    </div>
                </main>
            </SitePage>
        );
    }

    const date = params.get('tarih');
    const time = params.get('saat');
    const partySize = Number(params.get('kisi'));
    const valid = date && /^\d{4}-\d{2}-\d{2}$/.test(date) && time && /^\d{2}:\d{2}$/.test(time) && partySize > 0;
    const initial = valid ? { date, time, partySize } : undefined;

    return (
        <SitePage site={site} current="rezervasyon" overlayHeader={elit}>
            <main className={elit ? 'flex flex-1 flex-col' : main}>
            {elit ? (
                <EliteReservationHero site={site}>
                    <p {...textX} className={cn('m-0 max-w-[560px] font-[family-name:var(--site-serif)] text-xl italic leading-[1.45] text-[color-mix(in_srgb,var(--site-on-cover)_88%,transparent)] md:text-[22px]', textX.className)}>
                        Gününüzü, saatinizi ve masanızı seçin; talebiniz restorana iletilir, onaylanınca masanız sizi bekler.
                    </p>
                    {!edit && <Link to={RESERVATION_LOOKUP_PATH} className="inline-flex min-h-11 items-center border-b border-[var(--site-accent-on-dark)] text-xs uppercase tracking-[0.26em] text-[var(--site-on-cover)] no-underline">Rezervasyonumu sorgula →</Link>}
                </EliteReservationHero>
            ) : (
            <ReservationHero site={site} kicker="Rezervasyon" title="Masanızı" accent="ayırtın." titleProps={textX}
                action={!edit && <Link to={RESERVATION_LOOKUP_PATH} className={heroOutlineLink}>Rezervasyonumu sorgula →</Link>}>
                <p {...textX} className={cn('m-0 max-w-[520px] text-base leading-relaxed text-[rgba(251,244,232,0.85)] md:text-[17px]', textX.className)}>
                    Gününüzü, saatinizi ve masanızı seçin; talebiniz restorana iletilir, onaylanınca masanız sizi bekler.
                </p>
            </ReservationHero>
            )}
            <ExternalHint source="reservation" className="flex flex-1 flex-col">
            <div className={cn('flex flex-1 flex-col leading-normal text-[var(--site-text)]', elit && 'mx-auto w-full max-w-[1320px] px-2 py-10 sm:px-6 md:py-16')}>
                <ReservationFlow
                    // Hızlı seçiciden yeni bir seçimle gelinirse akış o seçimle baştan kurulur.
                    key={params.toString()}
                    site={site}
                    restaurantName={name}
                    mine={mine}
                    onSent={add}
                    onClose={() => navigate('/')}
                    initial={initial}
                    embedded
                />
            </div>
            </ExternalHint>
            </main>
        </SitePage>
    );
}
