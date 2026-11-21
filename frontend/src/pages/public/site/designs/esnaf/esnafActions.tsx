import { canReserveOnline, type PublicSite } from '@/features/customerSite/types';
import { useSiteCart } from '@/features/delivery/useSiteCart';
import { BagIcon, CalendarIcon, DirectionsIcon, MenuBookIcon, PhoneIcon } from '../../SiteCards';
import type { MobileAction } from '../../siteActions';
import { RESERVATION_PATH, type SitePageKey } from '../../siteParts';
import { directionsUrl, telHref } from '../../siteTheme';
import { fullAddress } from '../../useSite';

/**
 * Esnaf Tabelası'nın telefon alt çubuğu (başparmak altında): "Ara" ve ana eylem: online sipariş açıksa "Sipariş ver"
 * (esnafta çoğu müşteri paket ister), değilse "Masa ayırt", o da yoksa "Fiyat listesi". Ana eylem yoksa yanına
 * "Yol tarifi". Verisi olmayan düğme çizilmez.
 */
export function useEsnafMobileActions(site: PublicSite, current: SitePageKey): MobileAction[] {
    const cart = useSiteCart();
    const actions: MobileAction[] = [];
    const icon = 'h-[18px] w-[18px]';
    if (site.phone) actions.push({ key: 'ara', label: 'Ara', icon: <PhoneIcon className={icon} />, href: telHref(site.phone) });
    if (cart.enabled && current !== 'siparis') actions.push({ key: 'paket', label: 'Sipariş ver', icon: <BagIcon className={icon} />, to: '/siparis', primary: true });
    else if (canReserveOnline(site)) actions.push({ key: 'rez', label: 'Masa ayırt', icon: <CalendarIcon className={icon} />, to: RESERVATION_PATH, primary: true });
    else if (current !== 'menu') actions.push({ key: 'menu', label: 'Fiyat listesi', icon: <MenuBookIcon className={icon} />, to: '/menu', primary: true });
    else {
        const address = fullAddress(site);
        if (address) actions.push({ key: 'yol', label: 'Yol tarifi', icon: <DirectionsIcon className={icon} />, href: directionsUrl(address) });
    }
    return actions;
}
