import type { ComponentType } from 'react';
import type { PublicSite, ReservationStatusInfo } from '@/features/customerSite/types';
import { resolveDesign, type SiteDesignKey } from '../siteTheme';
import type { SitePageKey } from '../siteParts';
import { designTraits, type SiteDesignTraits } from './designTraits';
import EliteHome from '../elite/EliteHome';
import EliteMenu from '../elite/EliteMenu';
import EliteAbout from '../elite/EliteAbout';
import EliteContact from '../elite/EliteContact';
import EliteVenue from '../elite/EliteVenue';
import { EliteFooter, EliteHeader } from '../elite/EliteFrame';
import { ELITE_CSS, ELITE_FLOW_CSS } from '../elite/eliteParts';
import MeyhaneHome from './meyhane/MeyhaneHome';
import MeyhaneMenu from './meyhane/MeyhaneMenu';
import MeyhaneAbout from './meyhane/MeyhaneAbout';
import MeyhaneContact from './meyhane/MeyhaneContact';
import MeyhaneReservation from './meyhane/MeyhaneReservation';
import { MeyhaneFooter, MeyhaneHeader } from './meyhane/MeyhaneFrame';

// Tasarım kaydı: bir tasarımın KENDİ düzeni (sayfa bileşenleri, üst menü, alt bilgi, akış giydirmesi) tek yerde.
// Yazılmayan her parça ortak bileşene düşer (Renkli/Sade/Sıcak'ın paylaştığı düzen): tasarım yalnız değiştirdiğini yazar.
// Veri özellikleri (menü sunumu, akış sınıfı, alt çubuk) designTraits.ts'te; burada onlar da birleşik döner.
// Yeni tasarım nasıl eklenir: designs/README.md.

export interface DesignPageProps { site: PublicSite }
export interface DesignHomeProps extends DesignPageProps { mine: ReservationStatusInfo[] }
export interface DesignHeaderProps { site: PublicSite; current: SitePageKey; sticky: boolean; overlay: boolean }
export interface DesignFooterProps { site: PublicSite; bottomBar: boolean; visit: boolean }

export interface SiteDesignLayout extends SiteDesignTraits {
    /** Ana sayfa (/). Bileşen kendi `SitePage`ini çizer. */
    Home?: ComponentType<DesignHomeProps>;
    /** /menu */
    Menu?: ComponentType<DesignPageProps>;
    /** /hakkimizda */
    About?: ComponentType<DesignPageProps>;
    /** /iletisim */
    Contact?: ComponentType<DesignPageProps>;
    /** /mekan */
    Venue?: ComponentType<DesignPageProps>;
    /** /rezervasyon (akışı ReservationFlow ile kendisi kurar). */
    Reservation?: ComponentType<DesignPageProps>;
    /** Üst menü: site sayfaları ve akış sayfaları (FlowSiteHeader: paket sipariş, takip). */
    Header?: ComponentType<DesignHeaderProps>;
    /** Alt bilgi (site sayfaları). */
    Footer?: ComponentType<DesignFooterProps>;
    /** Site çerçevesinin kökünde basılan tasarım stili (Elit: hareket ve giydirme). */
    flowCss?: string;
}

type LayoutParts = Omit<SiteDesignLayout, keyof SiteDesignTraits>;

// Değerler fonksiyonla döner: sayfa bileşenleri de bu dosyanın içe aktardıklarını (SiteFrame…) kullandığından modüller
// döngülüdür; kayıt ilk çizimde okunur, yükleme sırasında değil.
const LAYOUTS: Partial<Record<SiteDesignKey, () => LayoutParts>> = {
    elit: () => ({
        Home: EliteHome, Menu: EliteMenu, About: EliteAbout, Contact: EliteContact, Venue: EliteVenue,
        Header: EliteHeader, Footer: EliteFooter, flowCss: ELITE_CSS + ELITE_FLOW_CSS,
    }),
    meyhane: () => ({
        Home: MeyhaneHome, Menu: MeyhaneMenu, About: MeyhaneAbout, Contact: MeyhaneContact, Reservation: MeyhaneReservation,
        Header: MeyhaneHeader, Footer: MeyhaneFooter,
    }),
};

/** Tasarımın düzeni: kendi bileşenleri + veri özellikleri. Boş/bilinmeyen tasarım = varsayılan (yalnız ortak bileşenler). */
export function designLayout(design?: string | null): SiteDesignLayout {
    const key = resolveDesign(design);
    return { ...designTraits(key), ...LAYOUTS[key]?.() };
}
