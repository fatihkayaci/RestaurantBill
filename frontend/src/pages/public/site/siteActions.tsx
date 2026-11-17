import type { ReactNode } from 'react';
import { canReserveOnline, type PublicSite } from '@/features/customerSite/types';
import { useOnlineOrderingAvailable } from '@/features/delivery/useOnlineOrderingAvailable';
import { BagIcon, CalendarIcon, DirectionsIcon, MenuBookIcon, PhoneIcon, WhatsAppIcon } from './SiteCards';
import { RESERVATION_PATH, type SitePageKey } from './siteParts';
import { directionsUrl, telHref, whatsappHref } from './siteTheme';
import { fullAddress } from './useSite';

// Telefon alt eylem çubuğunun düğmeleri (SiteFrame.tsx → MobileActionBar).

export interface MobileAction {
    key: string;
    label: string;
    icon: ReactNode;
    /** Site içi bağlantı (Link) ya da dış adres (a). */
    to?: string;
    href?: string;
    primary?: boolean;
}

/**
 * Her sayfada telefonda başparmak altında: Ara · Yol tarifi · Masa ayırt (rezervasyon yoksa Paket sipariş, o da yoksa Menü).
 * Verisi olmayan düğme çizilmez (telefon yoksa "Ara" yok). Rezervasyon akışında gösterilmez (iki "Devam et" çakışmasın).
 */
export function useMobileActions(site: PublicSite, current: SitePageKey): MobileAction[] {
    const canOrder = useOnlineOrderingAvailable();
    const address = fullAddress(site);
    const actions: MobileAction[] = [];
    if (site.phone) actions.push({ key: 'ara', label: 'Ara', icon: <PhoneIcon className="h-[18px] w-[18px]" />, href: telHref(site.phone) });
    if (address) actions.push({ key: 'yol', label: 'Yol tarifi', icon: <DirectionsIcon className="h-[18px] w-[18px]" />, href: directionsUrl(address) });
    else if (site.site.whatsappPhone) actions.push({ key: 'wa', label: 'WhatsApp', icon: <WhatsAppIcon className="h-[18px] w-[18px]" />, href: whatsappHref(site.site.whatsappPhone) });
    if (canReserveOnline(site)) actions.push({ key: 'rez', label: 'Masa ayırt', icon: <CalendarIcon className="h-[18px] w-[18px]" />, to: RESERVATION_PATH, primary: true });
    else if (canOrder) actions.push({ key: 'paket', label: 'Paket sipariş', icon: <BagIcon className="h-[18px] w-[18px]" />, to: '/siparis', primary: true });
    else if (current !== 'menu') actions.push({ key: 'menu', label: 'Menü', icon: <MenuBookIcon className="h-[18px] w-[18px]" />, to: '/menu', primary: true });
    return actions;
}

