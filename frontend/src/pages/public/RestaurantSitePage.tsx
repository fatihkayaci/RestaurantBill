import { useEffect, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { publicService } from '@/features/customerSite/api/publicService';
import type { PublicSite, ReservationStatusInfo } from '@/features/customerSite/types';
import { getApiErrorMessage } from '@/lib/apiError';
import { getTenantSlug } from '@/lib/tenant';
import { cn } from '@/lib/utils';
import MenuBrowser from './components/MenuBrowser';
import ReservationFlow from './site/ReservationFlow';
import {
    AboutSection, GallerySection, HoursSection, LocationSection, MyReservations, SiteFooter, SiteHeaderDesktop, SiteHero,
} from './site/SiteSections';
import { SITE_FONTS_HREF, headingFont, siteRootStyle, type SiteExtras } from './site/siteTheme';

const MAX_SAVED = 5;
const VIEW_PARAM = 'bolum';
const RESERVATION_VIEW = 'rezervasyon';

// Backend henüz logo, kapak, slogan, tanıtım, saat, galeri ve sosyal bağlantı vermiyor.
// Bu alanlar API'ye eklendiğinde buraya bağlanacak; boş kaldıkça ilgili bölümler hiç çizilmez.
const extras: SiteExtras = {};

const savedKey = () => `rb:reservations:${getTenantSlug() ?? 'dev'}`;

function readSavedIds(): string[] {
    try {
        const parsed: unknown = JSON.parse(localStorage.getItem(savedKey()) ?? '[]');
        return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
    } catch { return []; }
}

function saveIds(ids: string[]) {
    try { localStorage.setItem(savedKey(), JSON.stringify(ids.slice(0, MAX_SAVED))); } catch { /* özel pencere */ }
}

// Restoranın müşteriye açık sitesi (tasarım: canvas "Restoran Sitesi", Yön 1 · Sıcak).
// Ana sayfa: kapak, hızlı eylemler, menü, konum. Rezervasyon ayrı bir görünüm (?bolum=rezervasyon),
// böylece telefonda geri tuşu ana sayfaya döner.
export default function RestaurantSitePage() {
    const [site, setSite] = useState<PublicSite | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [mine, setMine] = useState<ReservationStatusInfo[]>([]);
    const [params, setParams] = useSearchParams();
    const reserving = params.get(VIEW_PARAM) === RESERVATION_VIEW;

    useEffect(() => {
        let cancelled = false;
        publicService.getSite()
            .then(data => { if (!cancelled) setSite(data); })
            .catch(err => { if (!cancelled) setLoadError(getApiErrorMessage(err, 'Sayfa yüklenemedi. İnternet bağlantınızı kontrol edip yenileyin.')); });
        return () => { cancelled = true; };
    }, []);

    // Daha önce bu cihazdan gönderilen rezervasyon taleplerinin güncel durumu.
    useEffect(() => {
        let cancelled = false;
        const ids = readSavedIds();
        if (ids.length === 0) return;
        Promise.all(ids.map(id => publicService.getReservationStatus(id).catch(() => null)))
            .then(results => {
                if (cancelled) return;
                const found = results.filter((r): r is ReservationStatusInfo => r !== null);
                setMine(found);
                saveIds(found.map(r => r.id));
            });
        return () => { cancelled = true; };
    }, []);

    const openReservation = () => {
        setParams({ [VIEW_PARAM]: RESERVATION_VIEW });
        window.scrollTo({ top: 0 });
    };
    const closeReservation = () => {
        setParams({});
        window.scrollTo({ top: 0 });
    };
    const handleSent = (created: ReservationStatusInfo) => {
        setMine(prev => {
            const next = [created, ...prev.filter(r => r.id !== created.id)];
            saveIds(next.map(r => r.id));
            return next;
        });
    };

    const root = (children: ReactNode) => (
        <div style={siteRootStyle(extras.accentColor)} className="flex min-h-screen flex-col">
            <link rel="stylesheet" href={SITE_FONTS_HREF} precedence="default" />
            {children}
        </div>
    );

    if (loadError) {
        return root(
            <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                <h1 className={cn(headingFont, 'text-3xl font-bold')}>Sayfa açılamadı</h1>
                <p className="mt-2 max-w-sm text-base text-[var(--site-sub)]">{loadError}</p>
                <Link to="/login" className="mt-6 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--site-sub)] underline">Personel girişi</Link>
            </main>
        );
    }

    if (!site) {
        return root(
            <main className="flex-1" aria-busy="true">
                <div className="h-[150px] animate-pulse bg-[var(--site-band)] md:h-[560px]" />
                <div className="mx-auto max-w-3xl space-y-3 px-5 py-8">
                    <div className="h-10 w-56 animate-pulse rounded-lg bg-[var(--site-band)]" />
                    {[...Array(4)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-[14px] bg-[var(--site-band)]" />)}
                </div>
            </main>
        );
    }

    const name = site.companyName || site.branchName;
    const location = [site.district, site.city].filter(Boolean).join(', ');
    const canReserve = site.regions.length > 0;
    const onReserve = canReserve ? openReservation : undefined;

    if (reserving && canReserve) {
        return root(
            <ReservationFlow site={site} restaurantName={name} mine={mine} onSent={handleSent} onClose={closeReservation} />
        );
    }

    return root(
        <>
            <SiteHeaderDesktop name={name} logoUrl={extras.logoUrl} showLocation={Boolean(site.openAddress || location || site.phone)} onReserve={onReserve} />
            <SiteHero
                name={name}
                subtitle={extras.slogan || location}
                coverUrl={extras.coverUrl}
                logoUrl={extras.logoUrl}
                onReserve={onReserve}
                phone={site.phone}
                address={[site.openAddress, location].filter(Boolean).join(', ')}
            />

            <main className="flex flex-col">
                {mine.length > 0 && (
                    <div className="mx-auto w-full max-w-[1280px] px-5 pb-6 md:px-10 md:pt-12 lg:px-20">
                        <MyReservations items={mine} className="md:max-w-[560px]" />
                    </div>
                )}

                <AboutSection text={extras.about} />

                <section id="menu" aria-labelledby="menu-baslik" className="scroll-mt-0 bg-[var(--site-band)] py-7 md:py-20">
                    <div className="mx-auto w-full max-w-[1280px] md:px-5 lg:px-15">
                        <h2 id="menu-baslik" className={cn(headingFont, 'px-5 pb-3 text-2xl font-bold md:text-[40px]')}>Menü</h2>
                        <MenuBrowser categories={site.categories} tone="site" />
                    </div>
                </section>

                <HoursSection hours={extras.hours} />
                <LocationSection address={site.openAddress} location={location} phone={site.phone} />
                <GallerySection images={extras.gallery} />
            </main>

            <SiteFooter name={name} instagramUrl={extras.instagramUrl} whatsappUrl={extras.whatsappUrl} />
        </>
    );
}
