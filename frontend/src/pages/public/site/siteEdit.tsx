import { useEffect, useLayoutEffect, useRef, useState, type ElementType, type KeyboardEvent, type ReactNode } from 'react';
import type { BranchSite } from '@/features/customerSite/types';
import { cn } from '@/lib/utils';
import { serif } from './siteParts';
import {
    BRANCH_INFO_FIELDS, EXTERNAL_SOURCES, editExternal, textLimit, useSiteEdit, type SiteEditApi, type SiteEditTarget, type SiteListName, type SiteTextField,
} from './siteEditContext';

// Admin'deki görsel site düzenleyicisinin sitenin içindeki katmanı. Site sayfaları müşteri sitesiyle AYNI bileşenlerdir;
// düzenleyici yokken (müşteri sitesi) buradaki sarmalayıcılar hiçbir şey eklemez ve sayfa birebir aynı çizilir.
// Düzenleyicide (önizleme çerçevesi, pages/admin/site/editor) tıklayınca seçim, yazılar yerinde düzenlenir ve boş
// alanlar açık kesikli yer tutucu olarak görünür (müşteri görmez).

const EDIT_BLUE = '#2B7FFF';
// Sakin önizleme: varsayılan çerçeve yok; üstüne gelince ince bir çizgi (dokunmatikte hep hafif), seçiliyken belirgin.
// Ne olacağını önizlemenin imleç etiketi söyler ("Fotoğrafı değiştir", PreviewApp).
const hoverFrame = 'outline-1 outline-offset-2 outline-transparent hover:outline-[#2B7FFF]/60 [@media(hover:none)]:outline-[#2B7FFF]/30';
const selectedFrame = 'outline-2 outline-[#2B7FFF] hover:outline-[#2B7FFF]';

/**
 * Tıklayınca önizlemenin üstünde küçük pencere açan bölge (fotoğraf, saat, iletişim…). Düzenleyici yokken yalnız
 * `children` çizilir (sarmalayıcı yok, müşteri sitesi değişmez). Tıklama önizlemenin kökünde yakalanır
 * (`data-edit-target`; iç içe ise en içteki).
 */
export function EditableBlock({ target, className, children }: {
    target: SiteEditTarget; label?: string; chip?: string; className?: string; children: ReactNode;
}) {
    const edit = useSiteEdit();
    if (!edit) return <>{children}</>;
    const selected = edit.selected === target;
    return (
        <div data-edit-target={target} className={cn('relative cursor-pointer rounded-[inherit]', hoverFrame, selected && selectedFrame, className)}>
            {children}
        </div>
    );
}

/** Boş alanın yeri: yalnız düzenleyicide, açık kesikli bir yer tutucu ("+ Fotoğraf ekle"). Müşteri görmez. */
export function EmptySlot({ target, title, className }: { target: SiteEditTarget; title: string; hint?: string; className?: string }) {
    const edit = useSiteEdit();
    if (!edit?.showEmpty) return null;
    const selected = edit.selected === target;
    return (
        <div data-edit-target={target}
            className={cn("flex h-full min-h-[88px] cursor-pointer items-center justify-center rounded-[20px] border border-dashed border-[#CFC5B4] p-4 text-center font-[family-name:'DM_Sans',system-ui,sans-serif] text-[15px] font-semibold text-[#8A7D6E] transition-colors hover:border-[#2B7FFF] hover:text-[#1E4FA0]",
                selected && 'border-solid border-[#2B7FFF] text-[#1E4FA0]', className)}>
            {title}
        </div>
    );
}

/**
 * Başka bir admin sayfasından gelen bilgi (ad, adres, ürünler…): müşteri sitesinde olduğu gibi çizilir, düzenleyicide
 * gizlenir. `source` bilginin kaynağıdır (EXTERNAL_SOURCES).
 */
export function ExternalHint({ children }: { source: keyof typeof EXTERNAL_SOURCES; className?: string; children: ReactNode }) {
    const edit = useSiteEdit();
    // Düzenleyicide başka sayfadan gelen bilgi hiç çizilmez: önizlemede yalnız burada değişen yerler kalır.
    // (Nereden değiştiği "Genel ayarlar → Başka sayfalardan gelenler"de.)
    if (edit) return null;
    return <>{children}</>;
}

const toolButton = "flex h-8 w-8 items-center justify-center rounded-full text-[#2A1F14] transition-colors hover:bg-[#EFE8DB] disabled:opacity-35 disabled:hover:bg-transparent";

/**
 * Liste kartı (değer, kilometre taşı, yorum): düzenleyicide üstüne gelince sağ üstte küçük araç çubuğu (öne/sona al,
 * sil). Kartın yazıları EditableText ile yerinde düzenlenir. Düzenleyici yokken yalnız `children`.
 */
export function ListCard({ list, index, count, label, className, children }: {
    list: SiteListName; index: number; count: number; label: string; className?: string; children: ReactNode;
}) {
    const edit = useSiteEdit();
    if (!edit) return <>{children}</>;
    return (
        <div className={cn('group/list relative rounded-[20px]', className)}>
            {children}
            <div data-edit-ui="" role="toolbar" aria-label={`${label} ${index + 1}`}
                className="absolute right-2 top-2 z-20 flex items-center gap-0.5 rounded-full bg-white p-0.5 font-[family-name:'DM_Sans',system-ui,sans-serif] opacity-0 shadow-[0_6px_18px_rgba(0,0,0,0.2)] transition-opacity focus-within:opacity-100 group-hover/list:opacity-100 [@media(hover:none)]:opacity-100">
                <button type="button" className={toolButton} aria-label="Öne al" disabled={index === 0}
                    onClick={() => edit.listOp(list, { action: 'move', index, to: index - 1 })}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
                </button>
                <button type="button" className={toolButton} aria-label="Sona al" disabled={index === count - 1}
                    onClick={() => edit.listOp(list, { action: 'move', index, to: index + 1 })}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
                </button>
                <button type="button" className={cn(toolButton, 'text-[#A3301A] hover:bg-[#FDECE7]')} aria-label={`${label} sil`}
                    onClick={() => edit.listOp(list, { action: 'remove', index })}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
                </button>
            </div>
        </div>
    );
}

/** Listenin sonundaki "+ Ekle" kartı: yalnız düzenleyicide, sınıra ulaşılmadıysa. `hint`: altında küçük satır ("en fazla 6"). */
export function AddCard({ list, label, count, max, hint, className }: {
    list: SiteListName; label: string; count: number; max: number; hint?: string; className?: string;
}) {
    const edit = useSiteEdit();
    if (!edit || count >= max) return null;
    return (
        <button type="button" data-edit-ui="" data-edit-reveal={`list:${list}`} onClick={() => edit.listOp(list, { action: 'add' })}
            className={cn("flex min-h-[88px] w-full flex-col items-center justify-center gap-1.5 rounded-[20px] border border-dashed border-[#CFC5B4] p-4 text-center font-[family-name:'DM_Sans',system-ui,sans-serif] text-[15px] font-semibold text-[#8A7D6E] transition-colors hover:border-[#2B7FFF] hover:text-[#1E4FA0]", className)}>
            <span>+ {label}</span>
            {hint && <small className="text-[13px] font-medium">{hint}</small>}
        </button>
    );
}

/**
 * Yerinde yazılan metin. Düzenleyici yokken düz `<as className>{value}</as>`. Düzenleyicide: tıklayınca yazılır
 * (Enter bitirir, Esc vazgeçer, uzun metinde Shift+Enter yeni satır); boşken soluk `placeholder` görünür.
 * `fallback`: alan boşken müşterinin gördüğü yedek metin (ör. alt başlık yoksa büyük başlık).
 */
export function EditableText({ field, value, as: Tag = 'span', className, placeholder, fallback, multiline = false, id }: {
    field: SiteTextField; value: string; as?: ElementType; className?: string; placeholder: string; fallback?: string;
    multiline?: boolean; id?: string;
}) {
    const edit = useSiteEdit();
    if (!edit) return <Tag id={id} className={className}>{value || fallback}</Tag>;
    // Şubeye ait yazı (saat notu, nasıl gelinir) burada yazılmaz: tıklanınca nereden değiştiği gösterilir.
    if (BRANCH_INFO_FIELDS.includes(field)) {
        const x = editExternal(edit, 'branchInfo');
        return <Tag id={id} {...x} className={cn(className, x.className, !value && 'opacity-60')}>{value || fallback || placeholder}</Tag>;
    }
    return <EditableTextInner edit={edit} field={field} value={value} as={Tag} className={className} placeholder={placeholder}
        fallback={fallback} multiline={multiline} id={id} />;
}

function EditableTextInner({ edit, field, value, as: Tag, className, placeholder, fallback, multiline, id }: {
    edit: SiteEditApi; field: SiteTextField; value: string; as: ElementType; className?: string; placeholder: string;
    fallback?: string; multiline: boolean; id?: string;
}) {
    const ref = useRef<HTMLElement>(null);
    const [editing, setEditing] = useState(false);
    // Yazarken React metne dokunmaz (imleç kaçmasın): çocuk, düzenlemenin başındaki değerdir. Bitince öğe yeniden kurulur.
    const [startValue, setStartValue] = useState(value);
    const [epoch, setEpoch] = useState(0);
    const max = textLimit(field);
    // İstekler kısa ömürlüdür (düzenleyici birkaç saniye sonra temizler): sekme değişince yeni çizilen yazı da yakalar.
    const handledRequest = useRef(0);

    const start = () => {
        if (editing) return;
        setStartValue(value);
        setEditing(true);
        edit.select(`text:${field}`);
    };

    // Düzenleyiciden "bu alanı düzenle" (eksikler listesi, yeni kart): görünür yap ve yazmaya başla.
    const request = edit.focusRequest;
    useEffect(() => {
        if (!request || request.field !== field || request.n === handledRequest.current) return;
        handledRequest.current = request.n;
        ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setStartValue(value);
        setEditing(true);
        // value bilerek bağımlılıkta yok: istek yalnız bir kez işlenir.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [request, field]);

    useLayoutEffect(() => {
        const el = ref.current;
        if (!editing || !el) return;
        el.focus({ preventScroll: true });
        const doc = el.ownerDocument;
        const range = doc.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        const selection = doc.defaultView?.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
    }, [editing]);

    const finish = () => {
        setEditing(false);
        setEpoch(e => e + 1);
    };

    const onInput = () => {
        const el = ref.current;
        if (!el) return;
        let text = el.innerText.replace(/\u00a0/g, ' ');
        if (!multiline) text = text.replace(/\n/g, ' ');
        if (text.trim() === '') text = '';
        if (text.length > max) {
            text = text.slice(0, max);
            el.textContent = text;
            const range = el.ownerDocument.createRange();
            range.selectNodeContents(el);
            range.collapse(false);
            const selection = el.ownerDocument.defaultView?.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
        }
        edit.setText(field, text);
    };

    const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
        if (e.key === 'Enter' && (!multiline || !e.shiftKey)) {
            e.preventDefault();
            ref.current?.blur();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            edit.setText(field, startValue);
            ref.current?.blur();
        }
    };

    const shown = value || fallback || '';
    const selected = edit.selected === `text:${field}`;
    return (
        <Tag
            key={epoch}
            ref={ref}
            id={id}
            data-edit-text={field}
            data-placeholder={placeholder}
            role={editing ? 'textbox' : undefined}
            aria-multiline={editing ? multiline : undefined}
            aria-label={editing ? placeholder : undefined}
            contentEditable={editing ? 'plaintext-only' : undefined}
            suppressContentEditableWarning
            tabIndex={editing ? undefined : 0}
                        onClick={start}
            onFocus={start}
            onInput={onInput}
            onKeyDown={onKeyDown}
            onBlur={finish}
            className={cn(className, 'group/text relative cursor-text rounded-[4px] outline-1 outline-offset-[4px] outline-transparent hover:outline-[#2B7FFF]/60',
                (editing || selected) && 'outline-2 outline-[#2B7FFF] hover:outline-[#2B7FFF]',
                editing && 'bg-[rgba(43,127,255,0.08)] empty:before:opacity-60 empty:before:content-[attr(data-placeholder)]',
                !editing && !value && 'opacity-60')}
        >
            {editing ? startValue : shown || placeholder}
            {!editing && <PencilBadge />}
        </Tag>
    );
}

/**
 * Yazının düzenlenebilir olduğunu gösteren küçük mavi kalem rozeti (sağ üst köşe). Yalnız düzenleyicide, üstüne
 * gelince ya da odaktayken (dokunmatikte hep) ve yazarken değilken görünür; konumu mutlak olduğu için sitenin düzenini değiştirmez. Tıklama yazının kendisine gider.
 */
function PencilBadge() {
    return (
        <span aria-hidden="true" contentEditable={false} style={{ background: EDIT_BLUE }}
            className="pointer-events-none absolute right-0 top-0 z-10 flex h-6 w-6 translate-x-1/2 -translate-y-1/2 select-none items-center justify-center rounded-full text-white opacity-0 shadow-[0_2px_6px_rgba(0,0,0,0.25)] transition-opacity group-hover/text:opacity-100 group-focus/text:opacity-100 [@media(hover:none)]:opacity-100">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
        </span>
    );
}

type CoverKey = 'coverImageUrl' | 'menuHeroUrl' | 'aboutHeroUrl' | 'venueHeroUrl' | 'contactHeroUrl' | 'reservationHeroUrl';

const PAGE_COVERS: { target: string; label: string; key: CoverKey }[] = [
    { target: 'photo:cover', label: 'Anasayfa', key: 'coverImageUrl' },
    { target: 'photo:hero-menu', label: 'Menü', key: 'menuHeroUrl' },
    { target: 'photo:hero-hakkimizda', label: 'Hakkımızda', key: 'aboutHeroUrl' },
    { target: 'photo:hero-mekan', label: 'Mekân', key: 'venueHeroUrl' },
    { target: 'photo:hero-iletisim', label: 'İletişim', key: 'contactHeroUrl' },
    { target: 'photo:hero-rezervasyon', label: 'Rezervasyon', key: 'reservationHeroUrl' },
];

/**
 * Yalnız düzenleyicide, "Sayfa kapakları" sekmesi: her sayfanın en üstündeki büyük fotoğraf, o sayfanın kapağı gibi
 * (karartma + sitenin yazı tipinde başlık). Anasayfa kartı Anasayfa kapağıyla aynı alandır. Boş alt sayfa kapağı,
 * yerine görünen fotoğrafı soluk gösterir.
 */
export function PageCovers({ site, restaurantName }: { site: BranchSite; restaurantName: string }) {
    const edit = useSiteEdit();
    if (!edit) return null;
    const titles: Record<CoverKey, string> = {
        coverImageUrl: restaurantName, menuHeroUrl: 'Menü', aboutHeroUrl: 'Hakkımızda', venueHeroUrl: site.headline || 'Mekân',
        contactHeroUrl: 'İletişim', reservationHeroUrl: 'Masanızı ayırtın.',
    };
    return (
        <section aria-label="Sayfa kapakları" className="mx-auto flex w-full max-w-[1344px] flex-col gap-5 px-4 py-6 md:px-12 md:py-10">
            <p className="m-0 font-[family-name:'DM_Sans',system-ui,sans-serif] text-[15px] text-[var(--site-sub)]">Her sayfanın en üstündeki büyük fotoğraf.</p>
            <ul className="m-0 grid list-none grid-cols-1 gap-5 p-0 md:grid-cols-2">
                {PAGE_COVERS.map(c => {
                    const own = site[c.key];
                    const home = c.key === 'coverImageUrl';
                    const venue = c.key === 'venueHeroUrl';
                    const fallback = home ? '' : venue ? site.galleryImageUrls[0] || site.aboutImageUrl || site.coverImageUrl : site.coverImageUrl;
                    const shown = own || fallback;
                    const note = own ? null
                        : home ? 'Kapak yok: menü fotoğraflarından kolaj görünür'
                            : venue && site.galleryImageUrls[0] ? 'Mekân fotoğrafı kullanılıyor'
                                : venue && site.aboutImageUrl ? 'Hikâye fotoğrafı kullanılıyor' : 'Anasayfa kapağı kullanılıyor';
                    const selected = edit.selected === c.target;
                    return (
                        <li key={c.target} className="flex flex-col gap-2">
                            <span className="font-[family-name:'DM_Sans',system-ui,sans-serif] text-sm font-semibold text-[var(--site-text)]">{c.label}</span>
                            <div data-edit-target={c.target}
                                className={cn('relative flex aspect-[16/7] cursor-pointer flex-col justify-end overflow-hidden rounded-[18px] bg-[var(--site-hero)] text-white outline-1 outline-offset-2 outline-transparent hover:outline-[#2B7FFF]/60',
                                    selected && 'outline-2 outline-[#2B7FFF]')}>
                                {shown && <img src={shown} alt="" loading="lazy" className={cn('absolute inset-0 h-full w-full object-cover', !own && 'opacity-50')} />}
                                <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,16,12,0.35),rgba(20,16,12,0.72))]" />
                                <span className={cn(serif, 'relative px-5 pb-4 text-[34px] italic leading-none md:text-[40px]')}>{titles[c.key]}</span>
                                {note && (
                                    <span className="absolute left-3 top-3 flex flex-wrap items-center gap-2 font-[family-name:'DM_Sans',system-ui,sans-serif]">
                                        <span className="rounded-full bg-black/45 px-2.5 py-1 text-xs font-medium text-white/90">{note}</span>
                                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#1E4FA0]">+ Kendi kapağını seç</span>
                                    </span>
                                )}
                            </div>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
