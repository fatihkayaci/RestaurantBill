import { Navigate, useLocation } from 'react-router-dom';
import DeliveryOrderPage from './DeliveryOrderPage';
import { SiteShell } from './site/SiteChrome';
import { resolveDesign } from './site/siteTheme';
import { useSite } from './site/useSite';

// /siparis: tasarımın kendi menü sayfası siparişi de alıyorsa (Sophra: ayrı paket sipariş sayfası yok) menüye yönlenir;
// ?sube= (masa QR'ının "Paket servis" bağlantısı) ve ?tekrar= ("Tekrar sipariş ver") korunur. Öteki tasarımlar ve site
// alınamazsa eski sipariş sayfası açılır. Takip adresi (/siparis/takip/:token) değişmez.
const MENU_ORDERING_DESIGNS: ReadonlySet<string> = new Set(['sophra']);

export default function DeliveryOrderRoute() {
    const { site, error } = useSite();
    const { search } = useLocation();
    if (!site && !error) return <SiteShell><div className="min-h-screen bg-[var(--site-bg)]" /></SiteShell>;
    if (site && MENU_ORDERING_DESIGNS.has(resolveDesign(site.site.design))) return <Navigate to={`/menu${search}`} replace />;
    return <DeliveryOrderPage />;
}
