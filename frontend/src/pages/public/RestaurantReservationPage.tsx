import { useNavigate, useSearchParams } from 'react-router-dom';
import { canReserveOnline } from '@/features/customerSite/types';
import { cn } from '@/lib/utils';
import ReservationFlow from './site/ReservationFlow';
import { SiteShell, SiteStatus } from './site/SiteChrome';
import { HeaderSpacer, PageEmpty, PageHero, SitePage } from './site/SiteFrame';
import { serif } from './site/siteParts';
import { telHref } from './site/siteTheme';
import { restaurantName, useMyReservations, useSite } from './site/useSite';
import { EditableBlock, ExternalHint } from './site/siteEdit';
import { editExternal, useSiteEdit } from './site/siteEditContext';

// /rezervasyon: tam rezervasyon akışı (ortak başlık ve alt bilgiyle). Ana sayfadaki hızlı seçici seçimi
// ?tarih=2026-11-14&saat=19:00&kisi=2 ile gelir. Rezervasyon kapalıysa kısa bir bilgi sayfası.
export default function RestaurantReservationPage() {
    const { site, error } = useSite();
    const { mine, add } = useMyReservations();
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const textX = editExternal(useSiteEdit(), 'reservationText');

    if (!site) return <SiteShell><SiteStatus error={error} /></SiteShell>;

    const name = restaurantName(site);
    const heroImage = site.site.reservationHeroUrl || site.site.coverImageUrl;

    if (!canReserveOnline(site)) {
        return (
            <SitePage site={site} current="rezervasyon">
                <PageHero site={site} label={name} title="Rezervasyon" image={site.site.reservationHeroUrl} imageTarget="photo:hero-rezervasyon" imageLabel="Rezervasyon kapağı" />
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
            <EditableBlock target="photo:hero-rezervasyon" label="Rezervasyon kapağı" chip="Fotoğrafı değiştir" className="outline-offset-[-4px]">
            <section className="relative overflow-hidden bg-[#2A2622] text-white">
                {heroImage && (
                    <>
                        <img src={heroImage} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
                        <div aria-hidden="true" className="absolute inset-0 bg-[rgba(20,16,12,0.6)]" />
                    </>
                )}
                <HeaderSpacer />
                <div {...textX} className={cn('relative mx-auto flex w-full max-w-[1180px] flex-col gap-3 px-5 pb-10 pt-8 md:px-12 md:pb-16 md:pt-14', textX.className)}>
                    <span className="text-xs font-medium uppercase tracking-[0.28em] text-white/80">{name} · Rezervasyon</span>
                    <h1 className={cn(serif, 'm-0 text-[52px] leading-[0.92] tracking-[-0.025em] md:text-[96px]')}>Masanızı <span className="italic">ayırtın.</span></h1>
                    <p className="m-0 mt-1 max-w-[46ch] text-[15px] leading-relaxed text-white/85 md:text-[17px]">
                        Gününüzü, saatinizi ve masanızı seçin; talebiniz restorana iletilir, onaylanınca masanız sizi bekler.
                    </p>
                </div>
            </section>
            </EditableBlock>
            <ExternalHint source="reservation" className="flex flex-1 flex-col">
            <div className="flex flex-1 flex-col bg-[#F5F2ED] leading-normal text-[#141414]">
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
        </SitePage>
    );
}
