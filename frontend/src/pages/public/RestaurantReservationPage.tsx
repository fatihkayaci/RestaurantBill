import { useNavigate, useSearchParams } from 'react-router-dom';
import { canReserveOnline } from '@/features/customerSite/types';
import { cn } from '@/lib/utils';
import ReservationFlow from './site/ReservationFlow';
import { SiteShell, SiteStatus } from './site/SiteChrome';
import { HeaderSpacer, PageEmpty, PageHero, SitePage } from './site/SiteFrame';
import { serif } from './site/siteParts';
import { telHref } from './site/siteTheme';
import { restaurantName, useMyReservations, useSite } from './site/useSite';

// /rezervasyon: tam rezervasyon akışı (ortak başlık ve alt bilgiyle). Ana sayfadaki hızlı seçici seçimi
// ?tarih=2026-11-14&saat=19:00&kisi=2 ile gelir. Rezervasyon kapalıysa kısa bir bilgi sayfası.
export default function RestaurantReservationPage() {
    const { site, error } = useSite();
    const { mine, add } = useMyReservations();
    const [params] = useSearchParams();
    const navigate = useNavigate();

    if (!site) return <SiteShell><SiteStatus error={error} /></SiteShell>;

    const name = restaurantName(site);

    if (!canReserveOnline(site)) {
        return (
            <SitePage site={site} current="rezervasyon">
                <PageHero site={site} label={name} title="Rezervasyon" />
                <PageEmpty label="Rezervasyon" text="Online rezervasyon şu an alınmıyor.">
                    {site.phone && (
                        <p className="m-0 text-[#4A4640]">
                            Masa ayırtmak için bizi arayın: <a href={telHref(site.phone)} className="whitespace-nowrap font-semibold text-[#141414]">{site.phone}</a>
                        </p>
                    )}
                </PageEmpty>
            </SitePage>
        );
    }

    const date = params.get('tarih');
    const time = params.get('saat');
    const partySize = Number(params.get('kisi'));
    const valid = date && /^\d{4}-\d{2}-\d{2}$/.test(date) && time && /^\d{2}:\d{2}$/.test(time) && partySize > 0;
    const initial = valid ? { date, time, partySize } : undefined;

    return (
        <SitePage site={site} current="rezervasyon">
            <section className="relative overflow-hidden bg-[#2A2622] text-white">
                {site.site.coverImageUrl && (
                    <>
                        <img src={site.site.coverImageUrl} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
                        <div aria-hidden="true" className="absolute inset-0 bg-[rgba(20,16,12,0.6)]" />
                    </>
                )}
                <HeaderSpacer />
                <div className="relative mx-auto flex max-w-[1344px] flex-col gap-3 px-5 pb-10 pt-6 md:px-12 md:pb-14">
                    <span className="text-xs font-medium uppercase tracking-[0.28em] text-white/80">{name}</span>
                    <h1 className={cn(serif, 'm-0 text-[52px] leading-[0.92] tracking-[-0.025em] md:text-[88px]')}>Masanızı <span className="italic">ayırtın.</span></h1>
                </div>
            </section>
            <div className="flex-1 bg-[var(--site-bg)] font-[family-name:'Inter_Tight',system-ui,sans-serif] leading-normal text-[var(--site-text)]">
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
        </SitePage>
    );
}
