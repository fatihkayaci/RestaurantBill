import { useEffect, useMemo, useRef, useState, type ComponentType, type FormEvent, type MouseEvent } from 'react';
import { Link, MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { PublicSite } from '@/features/customerSite/types';
import RestaurantSitePage from '@/pages/public/RestaurantSitePage';
import RestaurantMenuPage from '@/pages/public/RestaurantMenuPage';
import RestaurantAboutPage from '@/pages/public/RestaurantAboutPage';
import RestaurantVenuePage from '@/pages/public/RestaurantVenuePage';
import RestaurantContactPage from '@/pages/public/RestaurantContactPage';
import RestaurantReservationPage from '@/pages/public/RestaurantReservationPage';
import { SiteEditContext, SitePreviewContext, hoverLabel, useSitePreview, useSiteWindow, type EditAnchor, type SiteEditApi } from '@/pages/public/site/siteEditContext';
import { PageCovers } from '@/pages/public/site/siteEdit';
import { SitePage } from '@/pages/public/site/SiteFrame';
import { restaurantName } from '@/pages/public/site/useSite';

// Önizleme çerçevesinin içindeki uygulama (ayrı React kökü, SitePreviewFrame). Sayfalar müşteri sitesinin kendi
// bileşenleridir; site verisi SitePreviewContext'ten (taslak), düzenleme SiteEditContext'ten gelir ("Önizle"de null).
// Sitenin kendi bellek yönlendiricisi vardır: başlıktaki bağlantılar düzenleyicinin sekmesini değiştirir.

/** "Sayfa kapakları" sekmesi: sitenin bir sayfası değil, düzenleyicide kapakların bir arada gösterildiği yer. */
function CoversPage() {
    const preview = useSitePreview();
    if (!preview) return null;
    return (
        <SitePage site={preview.site} current="home">
            <main className="flex flex-1 flex-col">
                <PageCovers site={preview.site.site} restaurantName={restaurantName(preview.site)} />
            </main>
        </SitePage>
    );
}

const PAGES: Record<string, ComponentType> = {
    '/kapaklar': CoversPage,
    '/': RestaurantSitePage,
    '/menu': RestaurantMenuPage,
    '/hakkimizda': RestaurantAboutPage,
    '/mekan': RestaurantVenuePage,
    '/iletisim': RestaurantContactPage,
    '/rezervasyon': RestaurantReservationPage,
};

export interface PreviewAppProps {
    win: Window;
    site: PublicSite;
    edit: SiteEditApi | null;
    /** Düzenleyicinin seçili sekmesinin yolu. */
    path: string;
    onPath: (path: string) => void;
}

/** Tıklanan öğe (çerçevenin belgesinden geldiği için `instanceof Element` kullanılamaz). */
function elementOf(target: EventTarget | null): Element | null {
    return target && typeof (target as Element).closest === 'function' ? target as Element : null;
}

function rectOf(el: Element): EditAnchor {
    const r = el.getBoundingClientRect();
    return { top: r.top, left: r.left, width: r.width, height: r.height };
}

const HIT = '[data-edit-text], [data-edit-target], [data-edit-external]';

/**
 * İmlecin yanındaki tek küçük etiket: tıklayınca ne olacağını söyler ("Fotoğrafı değiştir", gri "Ayarlar'da değişir").
 * Kendi durumunu tutar; sayfa her fare hareketinde yeniden çizilmez.
 */
function HoverLabel() {
    const win = useSiteWindow();
    const [tip, setTip] = useState<{ text: string; muted: boolean; x: number; y: number } | null>(null);
    useEffect(() => {
        const doc = win.document;
        let frame = 0;
        let last: globalThis.MouseEvent | null = null;
        const update = () => {
            frame = 0;
            const el = last ? elementOf(last.target) : null;
            const hit = el && !el.closest('[data-edit-ui]') ? el.closest(HIT) : null;
            if (!last || !hit || (hit as HTMLElement).isContentEditable) { setTip(null); return; }
            const label = hit.hasAttribute('data-edit-text') ? hoverLabel('text', '')
                : hit.hasAttribute('data-edit-target') ? hoverLabel('target', hit.getAttribute('data-edit-target') ?? '')
                    : hoverLabel('external', hit.getAttribute('data-edit-external') ?? '');
            const { clientX: x, clientY: y } = last;
            setTip(prev => (prev && prev.text === label.text && prev.x === x && prev.y === y ? prev : { ...label, x, y }));
        };
        const onMove = (e: globalThis.MouseEvent) => {
            last = e;
            if (!frame) frame = win.requestAnimationFrame(update);
        };
        const hide = () => { last = null; setTip(null); };
        doc.addEventListener('mousemove', onMove);
        doc.documentElement.addEventListener('mouseleave', hide);
        win.addEventListener('scroll', hide, { passive: true });
        return () => {
            doc.removeEventListener('mousemove', onMove);
            doc.documentElement.removeEventListener('mouseleave', hide);
            win.removeEventListener('scroll', hide);
            if (frame) win.cancelAnimationFrame(frame);
        };
    }, [win]);
    if (!tip) return null;
    return (
        <span aria-hidden="true" style={{ left: Math.min(tip.x + 14, win.innerWidth - 230), top: tip.y + 18 }}
            className={cn("pointer-events-none fixed z-[1000] whitespace-nowrap rounded-md px-2 py-1 font-[family-name:'DM_Sans',system-ui,sans-serif] text-[13px] font-semibold not-italic leading-none tracking-normal shadow-[0_4px_12px_rgba(0,0,0,0.2)]",
                tip.muted ? 'bg-[#4A4440] text-white' : 'bg-[#2B7FFF] text-white')}>
            {tip.text}
        </span>
    );
}

function PreviewPages({ edit, path, onPath }: Pick<PreviewAppProps, 'edit' | 'path' | 'onPath'>) {
    const location = useLocation();
    const navigate = useNavigate();
    const lastPath = useRef(path);

    // Düzenleyicide sekme değişti → site o sayfaya gider.
    useEffect(() => {
        if (path === lastPath.current) return;
        lastPath.current = path;
        if (location.pathname !== path) navigate(path);
    }, [path, location.pathname, navigate]);

    // Sitede bir bağlantıya tıklandı → düzenleyicinin sekmesi değişir (bilinmeyen sayfada sekme aynı kalır).
    // Yalnız sitenin adresi değişince bildirilir (sekme değişirken eski adres geri bildirilmesin).
    const onPathRef = useRef(onPath);
    useEffect(() => { onPathRef.current = onPath; });
    useEffect(() => { onPathRef.current(location.pathname); }, [location.pathname]);

    // Tıklanan öğe: kaydırınca pencere onun yanında kalsın diye konumu yeniden ölçülür.
    const anchorEl = useRef<Element | null>(null);
    const win = useSiteWindow();
    const selected = edit?.selected ?? null;
    const editRef = useRef(edit);
    useEffect(() => { editRef.current = edit; });

    useEffect(() => {
        if (!selected || selected.startsWith('text:')) return;
        let frame = 0;
        const onScroll = () => {
            if (frame) return;
            frame = win.requestAnimationFrame(() => {
                frame = 0;
                const el = anchorEl.current;
                if (el?.isConnected) editRef.current?.select(selected, rectOf(el));
            });
        };
        win.addEventListener('scroll', onScroll, { passive: true });
        win.addEventListener('resize', onScroll);
        return () => {
            win.removeEventListener('scroll', onScroll);
            win.removeEventListener('resize', onScroll);
            if (frame) win.cancelAnimationFrame(frame);
        };
    }, [selected, win]);

    // Eksikler listesinden "göster": öğeye kaydır, kısa süre vurgula, penceresi varsa aç. Sekme değiştiyse sayfa
    // çizilince bulunur (istek, öğe bulunana kadar bekler).
    const reveal = edit?.revealRequest ?? null;
    const handledReveal = useRef(0);
    useEffect(() => {
        if (!reveal || reveal.n === handledReveal.current) return;
        const t = reveal.target;
        const esc = (v: string) => v.replace(/"/g, '\\"');
        const selector = t.startsWith('external:')
            ? `[data-edit-external="${esc(t.slice(9))}"]`
            : `[data-edit-target="${esc(t)}"], [data-edit-reveal="${esc(t)}"]`;
        const el = win.document.querySelector(selector);
        if (!el) return;
        handledReveal.current = reveal.n;
        el.scrollIntoView({ block: 'center' });
        const node = el as HTMLElement;
        const previous = node.style.boxShadow;
        node.style.boxShadow = '0 0 0 4px #2B7FFF';
        win.setTimeout(() => { node.style.boxShadow = previous; }, 1600);
        anchorEl.current = el;
        if (!el.hasAttribute('data-edit-reveal')) editRef.current?.select(t, rectOf(el));
    }, [reveal, location.pathname, win]);

    const onClickCapture = (e: MouseEvent) => {
        if (!edit) return;
        const el = elementOf(e.target);
        // Düzenleyicinin kendi düğmeleri (kart araç çubuğu, "+ Ekle") kendi işini yapar.
        if (!el || el.closest('[data-edit-ui]')) return;
        const hit = el.closest(HIT);
        if (!hit) {
            // Boş yer ya da site içi bağlantı: pencere kapanır; dış bağlantılar (harita, telefon) düzenlerken açılmaz.
            const anchor = el.closest('a');
            const href = anchor?.getAttribute('href') ?? '';
            if (anchor && !href.startsWith('/') && !href.startsWith('#')) e.preventDefault();
            edit.select(null);
            return;
        }
        if (hit.hasAttribute('data-edit-text')) {
            if (el.closest('a')) e.preventDefault();
            return;
        }
        e.preventDefault();
        e.stopPropagation();
        anchorEl.current = hit;
        const target = hit.getAttribute('data-edit-target') ?? `external:${hit.getAttribute('data-edit-external')}`;
        edit.select(target, rectOf(hit));
    };

    // Önizlemede form gönderilmez (iletişim formu, rezervasyon): gerçek talep oluşmasın.
    const onSubmitCapture = (e: FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        toast.info('Önizlemede form gönderilmez.');
    };

    const Page = PAGES[location.pathname];
    return (
        <div onClickCapture={onClickCapture} onSubmitCapture={onSubmitCapture}>
            {edit && <HoverLabel />}
            {Page ? <Page /> : (
                <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F5F0E8] p-8 text-center font-[family-name:'DM_Sans',system-ui,sans-serif] text-[#2A1F14]">
                    <p className="m-0 text-lg font-semibold">Bu sayfa düzenleyicide gösterilmez.</p>
                    <p className="m-0 max-w-[40ch] text-sm text-[#6B5E52]">Paket sipariş, rezervasyon sorgulama ve diğer akışlar sitenin içeriğinden değil, ayarlardan gelir.</p>
                    <Link to={path} className="rounded-[10px] bg-[#C8A96E] px-4 py-2.5 text-sm font-semibold text-[#1C1510]">Geri dön</Link>
                </div>
            )}
        </div>
    );
}

export function PreviewApp({ win, site, edit, path, onPath }: PreviewAppProps) {
    const preview = useMemo(() => ({ site, win }), [site, win]);
    return (
        <SitePreviewContext.Provider value={preview}>
            <SiteEditContext.Provider value={edit}>
                {/* Düzenleme ↔ Önizle geçişinde site baştan kurulur: Önizle'de başka sayfaya gidilmişse düzenleyici sekmesine döner. */}
                <MemoryRouter key={edit ? 'duzenle' : 'onizle'} initialEntries={[path]}>
                    <PreviewPages edit={edit} path={path} onPath={onPath} />
                </MemoryRouter>
            </SiteEditContext.Provider>
        </SitePreviewContext.Provider>
    );
}
