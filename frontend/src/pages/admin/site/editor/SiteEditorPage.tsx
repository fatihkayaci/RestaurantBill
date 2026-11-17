import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, ChevronDown, ChevronLeft, ChevronUp, ExternalLink, Eye, Loader2, Monitor, MoreHorizontal, Settings2, Smartphone, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { Modal, ModalTitle } from '@/components/ui/modal';
import { PageError, PageLoading } from '@/components/ui/page-state';
import { publicService } from '@/features/customerSite/api/publicService';
import { siteSettingsService } from '@/features/customerSite/api/siteSettingsService';
import type { PublicSite, SiteChange, SiteCompleteness } from '@/features/customerSite/types';
import { getSession } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { normalizeSite } from '@/pages/public/site/useSite';
import {
    textLimit, type EditAnchor, type SiteEditApi, type SiteEditTarget, type SiteListName, type SiteTextField,
} from '@/pages/public/site/siteEditContext';
import { photoTarget, type EditorCtx } from './editorActions';
import { doneCount, itemAction, missingItems } from '../siteGuidance';
import {
    COMPLETENESS_TARGETS, EDIT_TABS, buildPreviewSite, getText, popoverKind, relativeTime, tabByPath, tabPath, textFieldLabel,
    withListOp, withText, type EditorTab, type ListOp,
} from './editorModel';
import { ContactFields, DesignFields, ExternalList, FontFields, HoursFields, PopoverBody, RatingFields, SeoFields, ThemeFields } from './EditorSections';
import { ed } from './editorStyles';
import { StockGrid, UploadDrop } from './PhotoPicker';
import { PreviewApp } from './PreviewApp';
import { SitePreviewFrame } from './SitePreviewFrame';
import { useSiteEditor } from './useSiteEditor';

// Admin /admin/site: restoran sitesinin görsel düzenleyicisi (docs/site-editor.md). Ortada müşteri sitesinin KENDİ
// sayfaları taslakla çizilir (iframe, SitePreviewFrame) ve her şey önizlemenin üstünde düzenlenir: yazılar yerinde,
// fotoğraflar tıklanan fotoğrafın üstünde açılan menüyle (Yükle · Hazır görsellerden seç · Kaldır), liste kartları
// kartın üstünde, saat/iletişim/puan küçük pencerede; başka sayfadan gelen bilgi tıklanınca nereden değiştiğini söyler.
// Site geneli ayarlar tek yerde: "Genel ayarlar". Dar ekranda pencereler alttan açılır.

const DESKTOP_WIDTH = 1280;
const PHONE = { width: 390, height: 844 };
const STAGE_PAD = 12;
/** Panelden gelen istekler kısa ömürlüdür: sekme değişince yeni çizilen öğe yakalar, sonra temizlenir. */
const HINT_KEY = 'rb:site-editor-hint-done';

const GUIDE_KEY = 'rb:site-editor-guide-collapsed';

function readGuideCollapsed(): boolean {
    try { return localStorage.getItem(GUIDE_KEY) === '1'; } catch { return false; }
}

function readHintDone(): boolean {
    try { return localStorage.getItem(HINT_KEY) === '1'; } catch { return false; }
}
const REQUEST_TTL_MS = 2500;

function useMedia(query: string): boolean {
    const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
    useEffect(() => {
        const list = window.matchMedia(query);
        const onChange = () => setMatches(list.matches);
        list.addEventListener('change', onChange);
        return () => list.removeEventListener('change', onChange);
    }, [query]);
    return matches;
}

/** Öğenin iç ölçüsü (önizlemenin ölçeği bundan hesaplanır). `ref` bir geri çağırma ref'idir; öğe de döner. */
function useSize<T extends HTMLElement>() {
    const [el, setEl] = useState<T | null>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });
    useEffect(() => {
        if (!el) return;
        const observer = new ResizeObserver(([entry]) => {
            const width = Math.floor(entry.contentRect.width);
            const height = Math.floor(entry.contentRect.height);
            setSize(prev => (prev.width === width && prev.height === height ? prev : { width, height }));
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, [el]);
    return { ref: setEl, el, size };
}

/** Dakikada bir yenilenen "şimdi" ("Taslak kaydedildi · 2 dk önce"). */
function useNow(): Date {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const id = window.setInterval(() => setNow(new Date()), 30_000);
        return () => window.clearInterval(id);
    }, []);
    return now;
}

function slugOf(siteUrl: string): string | undefined {
    try { return new URL(siteUrl).hostname.split('.')[0] || undefined; } catch { return undefined; }
}

function hostOf(url: string): string {
    try { return new URL(url).host; } catch { return url; }
}

export default function SiteEditorPage() {
    const state = useSiteEditor();
    const { editor, texts } = state;
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const tab: EditorTab = (EDIT_TABS.find(t => t.key === params.get('sayfa'))?.key) ?? 'home';
    const [selection, setSelection] = useState<{ target: SiteEditTarget; anchor: EditAnchor | null } | null>(null);
    const [stockTarget, setStockTarget] = useState<SiteEditTarget | null>(null);
    // Boş alanlar düzenleyicide hep görünür (sessiz kesikli yer tutucu).
    const showEmpty = true;
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuView, setMenuView] = useState<'main' | 'score'>('main');
    const [hintDone, setHintDone] = useState(readHintDone);
    const [device, setDevice] = useState<'desktop' | 'phone'>('desktop');
    const [previewMode, setPreviewMode] = useState(false);
    const [focusRequest, setFocusRequest] = useState<{ field: SiteTextField; n: number } | null>(null);
    const [revealRequest, setRevealRequest] = useState<{ target: SiteEditTarget; n: number } | null>(null);
    // İstek numarası zaman damgası: süresi dolup temizlenen istekten sonra sayaç 1'e dönseydi önizleme yeni isteği "işlendi" sanardı.
    const [changesOpen, setChangesOpen] = useState(false);
    const [discardOpen, setDiscardOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [sheet, setSheet] = useState<'changes' | 'score' | null>(null);
    const [base, setBase] = useState<PublicSite | null>(null);
    const [baseError, setBaseError] = useState(false);
    const [baseTick, setBaseTick] = useState(0);
    const [completeness, setCompleteness] = useState<SiteCompleteness | null>(null);
    const [frameWin, setFrameWin] = useState<Window | null>(null);
    const narrow = !useMedia('(min-width: 768px)');
    const now = useNow();
    const { ref: stageRef, el: stageEl, size: stage } = useSize<HTMLDivElement>();

    const siteUrl = editor?.siteUrl ?? '';
    const loaded = editor !== null;

    // Önizlemenin menü, masa, adres verisi müşteri sitesinin ucundan (yayındaki); site içeriği taslaktan.
    useEffect(() => {
        if (!loaded) return;
        let cancelled = false;
        publicService.getSite(getSession()?.restaurantId ?? undefined, slugOf(siteUrl))
            .then(data => { if (!cancelled) { setBase(normalizeSite(data)); setBaseError(false); } })
            .catch(() => { if (!cancelled) setBaseError(true); });
        return () => { cancelled = true; };
    }, [loaded, siteUrl, baseTick]);

    // Rehber taslağı puanlar: her kayıttan (sürüm değişince) kısa süre sonra yenilenir, düzenledikçe ilerler.
    const draftVersion = editor?.version ?? -1;
    useEffect(() => {
        let cancelled = false;
        const id = window.setTimeout(() => {
            siteSettingsService.getCompleteness(true).then(d => { if (!cancelled) setCompleteness(d); }).catch(() => { /* rehber gizli */ });
        }, draftVersion < 0 ? 0 : 800);
        return () => { cancelled = true; window.clearTimeout(id); };
    }, [baseTick, draftVersion]);

    // Son eksik de tamamlanınca bir kez "Siteniz hazır".
    const missingCount = completeness ? missingItems(completeness).length : null;
    const prevMissing = useRef<number | null>(null);
    useEffect(() => {
        if (missingCount === 0 && prevMissing.current !== null && prevMissing.current > 0) toast.success('Siteniz hazır.');
        if (missingCount !== null) prevMissing.current = missingCount;
    }, [missingCount]);

    const [guideCollapsed, setGuideCollapsed] = useState(readGuideCollapsed);
    const toggleGuide = useCallback((collapsed: boolean) => {
        setGuideCollapsed(collapsed);
        try { localStorage.setItem(GUIDE_KEY, collapsed ? '1' : '0'); } catch { /* özel pencere */ }
    }, []);

    // İstekler kısa süre sonra temizlenir (eski istek, sonradan çizilen öğede yeniden işlenmesin).
    useEffect(() => {
        if (!focusRequest && !revealRequest) return;
        const id = window.setTimeout(() => { setFocusRequest(null); setRevealRequest(null); }, REQUEST_TTL_MS);
        return () => window.clearTimeout(id);
    }, [focusRequest, revealRequest]);

    // İpucu ilk değişiklikte kalkar ve bir daha gösterilmez (tarayıcıda hatırlanır).
    const dismissHint = useCallback(() => {
        setHintDone(true);
        try { localStorage.setItem(HINT_KEY, '1'); } catch { /* özel pencere: yalnız bu oturumda kalkar */ }
    }, []);
    const editedNow = state.dirty || state.busy !== null;
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- ilk düzenleme dışarıdan (kayıt durumu) gelir; bir kez çalışır.
        if (editedNow && !hintDone) dismissHint();
    }, [editedNow, hintDone, dismissHint]);

    const site = useMemo(() => (base && editor && texts ? buildPreviewSite(base, editor.draft, texts) : null), [base, editor, texts]);

    const setTab = useCallback((next: EditorTab) => {
        setParams(p => {
            const q = new URLSearchParams(p);
            if (next === 'home') q.delete('sayfa'); else q.set('sayfa', next);
            return q;
        }, { replace: true });
        setSelection(null);
        setStockTarget(null);
    }, [setParams]);

    const onPath = useCallback((path: string) => {
        // Önizle'de sitenin kendi menüsüyle sekmesi olmayan sayfalara da gidilir; düzenleyici sekmesi değişmez.
        const next = tabByPath(path);
        if (previewMode) return;
        if (next && next !== tab && EDIT_TABS.some(t => t.key === next)) setTab(next);
    }, [tab, setTab, previewMode]);

    const { updateTexts } = state;
    const select = useCallback((target: SiteEditTarget | null, anchor?: EditAnchor | null) => {
        setSelection(prev => (target ? { target, anchor: anchor ?? (prev?.target === target ? prev.anchor : null) } : null));
        if (!target) setStockTarget(null);
    }, []);
    const focusText = useCallback((field: SiteTextField) => {
        setSelection({ target: `text:${field}`, anchor: null });
        setFocusRequest({ field, n: Date.now() });
    }, []);
    const openAdmin = useCallback((path: string) => navigate(path), [navigate]);
    const setText = useCallback((field: SiteTextField, value: string) => updateTexts(t => withText(t, field, value)), [updateTexts]);
    const listOp = useCallback((list: SiteListName, op: ListOp) => {
        let focus: SiteTextField | null = null;
        updateTexts(t => {
            const result = withListOp(t, list, op);
            focus = result.focus;
            return result.texts;
        });
        if (focus) focusText(focus);
    }, [updateTexts, focusText]);

    // Hazır "Sık sorulanlar" sorusunu gizle / göster: taslağın hiddenFaqs listesi (Yayınla'ya kadar yalnız taslakta).
    const toggleFaq = useCallback((key: string) => updateTexts(t => ({
        ...t, hiddenFaqs: t.hiddenFaqs.includes(key) ? t.hiddenFaqs.filter(k => k !== key) : [...t.hiddenFaqs, key],
    })), [updateTexts]);

    const selected = selection?.target ?? null;
    const editApi = useMemo<SiteEditApi | null>(() => (previewMode ? null : {
        showEmpty, selected, select, setText, listOp, openAdmin, focusRequest, revealRequest, toggleFaq,
    }), [previewMode, showEmpty, selected, select, setText, listOp, openAdmin, focusRequest, revealRequest, toggleFaq]);

    const closePopover = useCallback(() => { setSelection(null); setStockTarget(null); }, []);
    useEffect(() => {
        if (!selection && !stockTarget) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closePopover(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [selection, stockTarget, closePopover]);

    if (state.loadError && !editor) return <PageError onRetry={state.load} />;
    if (!editor || !texts) return <PageLoading />;

    const changes = editor.changes;
    const hasChanges = editor.hasChanges || state.dirty;
    const blocked = state.conflict !== null || state.save.state === 'error' || state.save.state === 'invalid';
    const canPublish = hasChanges && !blocked && state.action === null;
    const publishing = state.action === 'publish';
    const missing = completeness ? missingItems(completeness) : [];
    // Rehberin "Sıradaki"si: aynı sırada, ama önce burada yapılabilenler (ürün fotoğrafı gibi başka sayfaya giden en sona).
    const opensAdmin = (key: string) => Boolean(COMPLETENESS_TARGETS[key]?.admin && !COMPLETENESS_TARGETS[key]?.target);
    const next = missing.find(i => !opensAdmin(i.key)) ?? missing[0] ?? null;
    const progress = completeness ? doneCount(completeness) : null;
    const nextOpensAdmin = next ? opensAdmin(next.key) : false;
    const openScoreList = () => {
        if (narrow) { setSheet('score'); return; }
        setMenuView('score');
        setMenuOpen(true);
    };

    const ctx: EditorCtx | null = site ? {
        editor, texts, site, state, openAdmin, focusText,
        select: target => select(target),
        openStock: target => setStockTarget(target),
    } : null;

    const doPublish = async () => {
        setChangesOpen(false);
        setSheet(null);
        const ok = await state.publish();
        if (!ok) return;
        setPreviewMode(false);
        setBaseTick(t => t + 1);
        toast.success('Site yayınlandı.', {
            description: 'Müşteriler yeni hâli görüyor.',
            action: siteUrl ? { label: 'Siteyi aç ↗', onClick: () => window.open(siteUrl, '_blank', 'noopener') } : undefined,
        });
    };
    const doDiscard = async () => {
        setDiscardOpen(false);
        setSheet(null);
        if (await state.discard()) toast.success('Taslak silindi. Site son yayınlanan hâline döndü.');
    };
    const doRevert = (change: SiteChange) => void state.revert([change.field]);

    /** Eksikler listesinden: ilgili sekmeye geç, öğeyi göster ve düzenleyicisini aç. */
    const revealItem = (key: string) => {
        const where = COMPLETENESS_TARGETS[key];
        setSheet(null);
        setPreviewMode(false);
        if (!where) return;
        // Önizlemede yeri olmayan madde (ürün fotoğrafları, hiç bölüm yoksa bölümler) kendi admin sayfasında açılır.
        if (where.admin && (!where.target || (key === 'regions' && editor.draft.regionDetails.length === 0))) {
            openAdmin(where.admin);
            return;
        }
        if (where.tab !== tab) setTab(where.tab);
        if (where.text) focusText(where.text);
        else if (where.target) setRevealRequest({ target: where.target!, n: Date.now() });
    };

    // ── Önizleme ölçüsü ─────────────────────────────────────────────────────────────────────────
    let frame: { width: number; height: number; scale: number };
    if (narrow) frame = { width: Math.max(320, stage.width), height: Math.max(400, stage.height), scale: 1 };
    else if (device === 'phone') {
        const scale = Math.min(1, (stage.height - STAGE_PAD * 2) / PHONE.height);
        frame = { width: PHONE.width, height: PHONE.height, scale: scale > 0 ? scale : 1 };
    } else {
        const scale = Math.min(1, (stage.width - STAGE_PAD * 2) / DESKTOP_WIDTH);
        const s = scale > 0 ? scale : 1;
        frame = { width: DESKTOP_WIDTH, height: Math.max(500, (stage.height - STAGE_PAD * 2) / s), scale: s };
    }

    const pill = <StatusPill editor={editor} save={state.save} conflict={state.conflict !== null} now={now} dirty={state.dirty}
        open={changesOpen} onToggle={() => setChangesOpen(o => !o)} onRetry={state.retrySave} onReload={state.reloadAfterConflict} />;


    const popoverTarget = selection && popoverKind(selection.target) ? selection.target : null;
    const stockInfo = ctx && stockTarget ? photoTarget(ctx, stockTarget) : null;

    const previewNode = site ? (
        <SitePreviewFrame width={frame.width} height={frame.height} scale={frame.scale} title="Site önizlemesi"
            className={cn('overflow-hidden', !narrow && 'rounded-[14px] shadow-[0_0_0_1px_#D8CEBD,0_18px_40px_rgba(42,31,20,0.16)]', !narrow && device === 'phone' && 'rounded-[34px] shadow-[0_0_0_10px_#1C1510,0_30px_60px_rgba(42,31,20,0.25)]')}
            onWindow={setFrameWin}
            render={win => <PreviewApp win={win} site={site} edit={editApi} path={previewMode && tab === 'kapaklar' ? '/' : tabPath(tab)} onPath={onPath} />} />
    ) : baseError ? (
        <div className="flex flex-col items-center gap-3 rounded-xl bg-card p-8 text-center">
            <p className="m-0 text-sm text-foreground">Önizleme yüklenemedi. Sitenin adresi (Ayarlar → alan adı) tanımlı mı?</p>
            <button type="button" className={ed.btn} onClick={() => setBaseTick(t => t + 1)}>Tekrar dene</button>
        </div>
    ) : <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Önizleme yükleniyor" />;

    const stockLayer = stockInfo && ctx && (
        <div role="dialog" aria-label={`Hazır görsellerden seç: ${stockInfo.title}`}
            className="absolute inset-0 z-40 flex flex-col bg-[rgba(28,21,16,0.55)] p-0 backdrop-blur-[2px] md:p-6">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-card shadow-[0_20px_50px_rgba(0,0,0,0.3)] md:rounded-2xl">
                <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
                    <div className="flex min-w-0 flex-col">
                        <b className="text-base text-foreground">Hazır görsellerden seç · {stockInfo.title}</b>
                    </div>
                    <button type="button" onClick={() => setStockTarget(null)} className={cn(ed.btnGhost, 'ml-auto h-9 gap-1 px-2.5')}>
                        <X className="h-4 w-4" aria-hidden="true" />Kapat
                    </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                    <StockGrid large autoFocus currentUrl={stockInfo.current} markLabel={stockInfo.markLabel} actionHint="tıklayınca gelir"
                        busy={state.busy === stockInfo.busyKey}
                        onPick={image => void stockInfo.stock(image).then(ok => { if (ok !== false) closePopover(); })} />
                </div>
                <div className="border-t border-border px-5 py-3">
                    <UploadDrop compact busy={state.busy === stockInfo.busyKey} multiple={stockInfo.multiple}
                        onFiles={files => void stockInfo.upload(files).then(ok => { if (ok !== false) closePopover(); })} />
                </div>
            </div>
        </div>
    );

    const popover = popoverTarget && ctx && !stockTarget && !narrow && stageEl && frameWin?.frameElement && selection?.anchor && (
        <AnchoredPopover stage={stageEl} frame={frameWin.frameElement as HTMLElement} scale={frame.scale} anchor={selection.anchor}
            photo={popoverKind(popoverTarget) === 'photo'} wide={popoverTarget === 'hours'} onClose={closePopover}>
            <PopoverBody ctx={ctx} target={popoverTarget} onDone={closePopover} />
        </AnchoredPopover>
    );

    const stageNode = (
        <div ref={stageRef} className={cn('relative min-h-0 min-w-0 flex-1 overflow-hidden bg-[#E9E2D5] dark:bg-[#13100c]', !narrow && 'p-3')}>
            <div className={cn('flex h-full w-full', narrow ? 'items-stretch' : 'items-start justify-center')}>{previewNode}</div>
            {popover}
            {stockLayer}
            {!narrow && !previewMode && !selection && !stockTarget && site && !hintDone && <EditSteps onClose={dismissHint} />}
        </div>
    );

    // ── Telefon / dar ekran (canvas 7): pencereler alttan açılır ─────────────────────────────────
    if (narrow) {
        const editingText = selected?.startsWith('text:') ? selected.slice(5) as SiteTextField : null;
        const finishText = () => {
            (frameWin?.document.activeElement as HTMLElement | null)?.blur();
            setSelection(null);
        };
        const sheetContent: ReactNode = sheet === 'changes'
            ? <ChangesSheet changes={changes} busy={state.action !== null} onRevert={doRevert} onClose={() => setSheet(null)} onDiscard={() => setDiscardOpen(true)} />
            : sheet === 'score'
                ? <ScoreList items={missing} onPick={revealItem} onClose={() => setSheet(null)} />
                : popoverTarget && ctx && !stockTarget
                    ? (
                        <div className="flex min-h-0 flex-1 flex-col">
                            <div className="flex justify-end px-4 pt-1"><button type="button" onClick={closePopover} className="text-sm font-semibold text-muted-foreground">Kapat</button></div>
                            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5"><PopoverBody ctx={ctx} target={popoverTarget} onDone={closePopover} /></div>
                        </div>
                    ) : null;
        return (
            <div className="relative flex h-full min-h-0 flex-col bg-background">
                {previewMode ? (
                    <PreviewBar narrow onBack={() => setPreviewMode(false)} onPublish={() => void doPublish()} canPublish={canPublish} publishing={publishing} />
                ) : editingText ? (
                    <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card px-3">
                        <span className="pl-1.5 font-bold">{textFieldLabel(editingText)}</span>
                        <span className="ml-auto text-[13px] font-semibold text-muted-foreground tabular-nums">{getText(texts, editingText).length} / {textLimit(editingText)}</span>
                        <button type="button" onClick={finishText} className={cn(ed.btnGold, 'h-9')}>Bitti</button>
                    </div>
                ) : (
                    <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card px-3">
                        <button type="button" aria-label="Geri" onClick={() => navigate('/admin/overview')} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted">
                            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                        </button>
                        <label className="relative flex h-9 items-center rounded-[9px] border border-[#DDD3C2] font-bold dark:border-border">
                            <span className="sr-only">Sayfa</span>
                            <select value={tab} onChange={e => setTab(e.target.value as EditorTab)} className="h-full appearance-none bg-transparent pl-3 pr-8 font-bold outline-none">
                                {EDIT_TABS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2 h-4 w-4" aria-hidden="true" />
                        </label>
                        {hasChanges && (
                            <button type="button" onClick={() => setSheet('changes')} className="ml-auto flex items-center gap-1.5 text-[13px] font-semibold text-[#7A4E0E] dark:text-rb-amber" aria-label={`${changes.length} yayınlanmamış değişiklik`}>
                                <span className={ed.dot} aria-hidden="true" />{changes.length}
                            </button>
                        )}
                        <button type="button" disabled={!canPublish} onClick={() => void doPublish()} className={cn(ed.btnGold, 'h-9', !hasChanges && 'ml-auto')}>
                            {publishing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}Yayınla
                        </button>
                    </div>
                )}
                {(state.conflict || state.save.state === 'error' || state.save.state === 'invalid') && !previewMode && (
                    <div className="shrink-0 border-b border-border px-3 py-2">{pill}</div>
                )}
                {next && progress && !previewMode && !editingText && (
                    <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border bg-[#FBF6EC] px-3 text-[13px] dark:bg-muted/40">
                        <Sparkles className="h-3.5 w-3.5 shrink-0 text-rb-gold" aria-hidden="true" />
                        <span className="shrink-0 tabular-nums text-muted-foreground">{progress.done}/{progress.total}</span>
                        <span className="min-w-0 flex-1 truncate font-semibold text-foreground">{itemAction(next)}</span>
                        <button type="button" onClick={() => revealItem(next.key)} className={cn(ed.btnSm, 'h-7 px-2.5 text-xs')}>{nextOpensAdmin ? 'Git ↗' : 'Ekle'}</button>
                    </div>
                )}
                {stageNode}
                {!previewMode && !sheetContent && !editingText && !stockTarget && (
                    <nav aria-label="Düzenleyici" className="mx-3 mb-3 mt-2 grid h-16 shrink-0 grid-cols-3 rounded-[20px] bg-[#1C1510] text-xs font-semibold text-[#E8E1D6] shadow-[0_12px_30px_rgba(0,0,0,0.3)]">
                        <DockButton icon={<Settings2 className="h-5 w-5" />} label="Genel ayarlar" onClick={() => setSettingsOpen(true)} />
                        <DockButton icon={<Eye className="h-5 w-5" />} label="Tamamını gör" onClick={() => { closePopover(); setPreviewMode(true); }} />
                        <DockButton icon={<Sparkles className="h-5 w-5" />} label={completeness ? `Eksikler · ${missing.length}` : 'Eksikler'} onClick={() => setSheet('score')} />
                    </nav>
                )}
                {sheetContent && !previewMode && (
                    <div className="absolute inset-x-0 bottom-0 z-30 flex max-h-[78%] min-h-[30%] flex-col rounded-t-3xl bg-card shadow-[0_-14px_40px_rgba(0,0,0,0.25)]">
                        <span aria-hidden="true" className="mx-auto mt-2.5 h-[5px] w-10 shrink-0 rounded-full bg-[#D6CCBB]" />
                        <div className="flex min-h-0 flex-1 flex-col pt-2">{sheetContent}</div>
                    </div>
                )}
                <DiscardDialog open={discardOpen} changes={changes} onCancel={() => setDiscardOpen(false)} onConfirm={() => void doDiscard()} />
                {ctx && <GeneralSettingsDialog open={settingsOpen} ctx={ctx} base={base} onClose={() => setSettingsOpen(false)} />}
            </div>
        );
    }

    // ── Masaüstü / tablet ───────────────────────────────────────────────────────────────────────
    return (
        <div className="flex h-full min-h-0 flex-col bg-background">
            {previewMode ? (
                <PreviewBar onBack={() => setPreviewMode(false)} onPublish={() => void doPublish()} canPublish={canPublish} publishing={publishing} />
            ) : (
                <>
                    <header className="relative z-30 flex h-14 shrink-0 items-center gap-5 border-b border-border bg-card px-4">
                        <h1 className="m-0 whitespace-nowrap text-base font-bold text-foreground">Restoran sitesi</h1>
                        <nav aria-label="Site sayfaları" className="flex min-w-0 gap-4 self-stretch overflow-x-auto [scrollbar-width:none]">
                            {EDIT_TABS.map(t => (
                                <button key={t.key} type="button" onClick={() => setTab(t.key)} aria-current={tab === t.key ? 'page' : undefined}
                                    className={cn('flex h-14 items-center whitespace-nowrap border-b-2 text-sm font-semibold transition-colors',
                                        tab === t.key ? 'border-rb-gold text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}>
                                    {t.label}
                                </button>
                            ))}
                        </nav>
                        <div className="ml-auto flex shrink-0 items-center gap-2">
                            {next && progress && guideCollapsed && (
                                <button type="button" onClick={() => toggleGuide(false)} title="Sitenizi güzelleştirin"
                                    className="inline-flex h-7 items-center gap-1 rounded-full border border-border px-2.5 text-xs font-semibold tabular-nums text-muted-foreground hover:text-foreground">
                                    <Sparkles className="h-3.5 w-3.5 text-rb-gold" aria-hidden="true" />{progress.done}/{progress.total} ▸
                                </button>
                            )}
                            <div className="relative">
                                {pill}
                                {changesOpen && changes.length > 0 && (
                                    <Dropdown onClose={() => setChangesOpen(false)} className="w-[380px]">
                                        <div className="max-h-[60vh] overflow-y-auto"><ChangeRows changes={changes} busy={state.action !== null} onRevert={doRevert} /></div>
                                        <div className="border-t border-border p-2">
                                            <button type="button" disabled={state.action !== null || state.conflict !== null}
                                                onClick={() => { setChangesOpen(false); setDiscardOpen(true); }} className={cn(ed.btnGhost, 'h-9 w-full text-[#A3301A]')}>
                                                Değişiklikleri at
                                            </button>
                                        </div>
                                    </Dropdown>
                                )}
                            </div>
                            <button type="button" disabled={publishing} onClick={() => { closePopover(); setPreviewMode(true); }} className={cn(ed.btn, 'h-9 px-3')}
                                title="Sitenin tamamını gör">
                                <Eye className="h-4 w-4" aria-hidden="true" />Önizle
                            </button>
                            <button type="button" disabled={!canPublish} onClick={() => void doPublish()} className={cn(ed.btnGold, 'h-9 px-4')}>
                                {publishing && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                                {publishing ? 'Yayınlanıyor…' : 'Yayınla'}
                            </button>
                            <button type="button" onClick={() => setSettingsOpen(true)} title="Genel ayarlar" aria-label="Genel ayarlar"
                                className={cn(ed.btnGhost, 'h-9 w-9 px-0')}>
                                <Settings2 className="h-[18px] w-[18px]" aria-hidden="true" />
                            </button>
                            <div className="relative">
                                <button type="button" onClick={() => { setMenuView('main'); setMenuOpen(o => !o); }} aria-expanded={menuOpen} aria-label="Diğer"
                                    className={cn(ed.btnGhost, 'h-9 w-9 px-0')}>
                                    <MoreHorizontal className="h-[18px] w-[18px]" aria-hidden="true" />
                                </button>
                                {menuOpen && (
                                    <Dropdown onClose={() => setMenuOpen(false)} className={menuView === 'score' ? 'w-[360px]' : 'w-[240px]'}>
                                        {menuView === 'score' ? (
                                            <>
                                                <button type="button" onClick={() => setMenuView('main')} className="flex items-center gap-1 px-3 pt-2 text-[13px] font-semibold text-muted-foreground hover:text-foreground">
                                                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />Geri
                                                </button>
                                                <ScoreList items={missing} onPick={key => { setMenuOpen(false); revealItem(key); }} />
                                            </>
                                        ) : (
                                            <div className="flex flex-col p-1.5">
                                                <MenuItem icon={<Settings2 className="h-4 w-4" />} onClick={() => { setMenuOpen(false); setSettingsOpen(true); }}>Genel ayarlar</MenuItem>
                                                {siteUrl && (
                                                    <MenuItem icon={<ExternalLink className="h-4 w-4" />} onClick={() => { setMenuOpen(false); window.open(siteUrl, '_blank', 'noopener'); }}>
                                                        Siteyi aç <span className="text-muted-foreground">({hostOf(siteUrl)})</span>
                                                    </MenuItem>
                                                )}
                                                <div className="my-1 h-px bg-border" />
                                                <MenuItem icon={<Monitor className="h-4 w-4" />} checked={device === 'desktop'} onClick={() => { setDevice('desktop'); setMenuOpen(false); }}>Masaüstü görünümü</MenuItem>
                                                <MenuItem icon={<Smartphone className="h-4 w-4" />} checked={device === 'phone'} onClick={() => { setDevice('phone'); setMenuOpen(false); }}>Telefon görünümü</MenuItem>
                                                {completeness && (
                                                    <>
                                                        <div className="my-1 h-px bg-border" />
                                                        <MenuItem icon={<Sparkles className="h-4 w-4 text-rb-gold" />} onClick={() => setMenuView('score')}>Eksikler ({missing.length})</MenuItem>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </Dropdown>
                                )}
                            </div>
                        </div>
                    </header>
                    {next && progress && !guideCollapsed && (
                        <GuideStrip done={progress.done} total={progress.total} score={completeness!.score} action={itemAction(next)}
                            opensAdmin={nextOpensAdmin} onAdd={() => revealItem(next.key)} onAll={openScoreList} onCollapse={() => toggleGuide(true)} />
                    )}
                    {state.conflict && (
                        <div role="alert" className="flex shrink-0 flex-wrap items-center gap-3 border-b border-[#F0B4A3] bg-[#FDECE7] px-5 py-2.5 text-sm text-[#A3301A] dark:border-rb-red/40 dark:bg-rb-red-bg dark:text-rb-red">
                            <b>Başkası da düzenledi.</b>
                            <span>Site başka bir oturumda da değişti. Son hâli yükleyip devam edin; son birkaç saniyede yazdıklarınız kaydedilmemiş olabilir.</span>
                            <button type="button" onClick={state.reloadAfterConflict} className={cn(ed.btnSm, 'ml-auto')}>Son hâli yükle</button>
                        </div>
                    )}
                </>
            )}
            <div className="relative flex min-h-0 flex-1">{stageNode}</div>
            <DiscardDialog open={discardOpen} changes={changes} onCancel={() => setDiscardOpen(false)} onConfirm={() => void doDiscard()} />
            {ctx && <GeneralSettingsDialog open={settingsOpen} ctx={ctx} base={base} onClose={() => setSettingsOpen(false)} />}
        </div>
    );
}

// ── Önizlemenin üstündeki pencere ───────────────────────────────────────────────────────────────

/**
 * Tıklanan öğenin yanında (aşağısında, sığmazsa üstünde) açılan küçük pencere. Büyük fotoğraflarda fotoğrafın üstüne,
 * sol üst köşeye oturur. Konum önizleme çerçevesinin ölçeğine göre hesaplanır; dışarı tıklayınca kapanır.
 */
function AnchoredPopover({ stage, frame, scale, anchor, photo, wide, onClose, children }: {
    stage: HTMLElement; frame: HTMLElement; scale: number; anchor: EditAnchor; photo: boolean; wide: boolean; onClose: () => void; children: ReactNode;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
    const width = wide ? 440 : photo ? 300 : 360;

    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        const s = stage.getBoundingClientRect();
        const f = frame.getBoundingClientRect();
        const a = {
            left: f.left - s.left + anchor.left * scale,
            top: f.top - s.top + anchor.top * scale,
            width: anchor.width * scale,
            height: anchor.height * scale,
        };
        const h = el.offsetHeight;
        const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(v, Math.max(min, max)));
        let top: number;
        let left = clamp(a.left, 8, s.width - width - 8);
        if (photo && a.width >= 260 && a.height >= 140) {
            top = clamp(Math.max(a.top, 0) + 12, 8, s.height - h - 8);
            left = clamp(a.left + 12, 8, s.width - width - 8);
        } else if (a.top + a.height + 8 + h <= s.height - 8) top = a.top + a.height + 8;
        else if (a.top - 8 - h >= 8) top = a.top - h - 8;
        else top = clamp(a.top + 12, 8, s.height - h - 8);
        setPos(prev => (prev && prev.top === top && prev.left === left ? prev : { top, left }));
        // İçerik (children) değişince de yeniden yerleşir: yükseklik değişmiş olabilir.
    }, [stage, frame, anchor.left, anchor.top, anchor.width, anchor.height, scale, width, photo, children]);

    useEffect(() => {
        const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [onClose]);

    return (
        <div ref={ref} role="dialog" aria-label="Düzenle"
            style={{ top: pos?.top ?? -9999, left: pos?.left ?? 0, width, maxHeight: 'calc(100% - 16px)' }}
            className="absolute z-30 flex flex-col gap-3 overflow-y-auto rounded-2xl border border-border bg-card p-4 text-foreground shadow-[0_18px_44px_rgba(42,31,20,0.24)]">
            <button type="button" onClick={onClose} aria-label="Kapat" className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground">
                <X className="h-4 w-4" aria-hidden="true" />
            </button>
            {children}
        </div>
    );
}

// ── "Genel ayarlar" ─────────────────────────────────────────────────────────────────────────────

const SETTINGS_SECTIONS = [
    { id: 'genel-saat', label: 'Çalışma saatleri' },
    { id: 'genel-iletisim', label: 'İletişim ve sosyal' },
    { id: 'genel-tasarim', label: 'Tasarımlar' },
    { id: 'genel-yazi', label: 'Yazı tipi' },
    { id: 'genel-tema', label: 'Tema ve renk' },
    { id: 'genel-google', label: 'Google ve paylaşım' },
    { id: 'genel-diger', label: 'Başka sayfalardan gelenler' },
];

function GeneralSettingsDialog({ open, ctx, base, onClose }: { open: boolean; ctx: EditorCtx; base: PublicSite | null; onClose: () => void }) {
    const live = base?.seo ? { title: base.seo.title, description: base.seo.description, imageUrl: base.seo.shareImageUrl } : null;
    const bodyRef = useRef<HTMLDivElement>(null);
    // Yalnız pencerenin içi kayar (scrollIntoView dış katmanı da kaydırırdı).
    const jump = (id: string) => {
        const body = bodyRef.current;
        const el = body?.querySelector<HTMLElement>(`#${id}`);
        if (body && el) body.scrollTo({ top: el.offsetTop - 8, behavior: 'smooth' });
    };
    const section = (id: string, title: string, body: ReactNode) => (
        <section id={id} aria-labelledby={`${id}-baslik`} className="flex scroll-mt-4 flex-col gap-3.5 border-t border-border pt-5 first:border-t-0 first:pt-0">
            <h3 id={`${id}-baslik`} className="m-0 text-lg font-bold text-foreground">{title}</h3>
            {body}
        </section>
    );
    return (
        <Modal open={open} onClose={onClose} overlayClassName="bg-black/40 backdrop-blur-sm md:p-6">
            <div className="flex h-full max-h-[100dvh] w-full max-w-[1040px] flex-col overflow-hidden bg-card shadow-[0_20px_50px_rgba(42,31,20,0.25)] md:h-[min(860px,calc(100dvh-64px))] md:rounded-2xl">
                <div className="flex shrink-0 flex-col gap-3 border-b border-border px-5 pb-3 pt-4 md:px-7">
                    <div className="flex items-center gap-3">
                        <ModalTitle className="m-0 text-xl font-bold text-foreground">Genel ayarlar</ModalTitle>
                        <button type="button" onClick={onClose} className={cn(ed.btnGhost, 'ml-auto h-9 gap-1 px-2.5')}><X className="h-4 w-4" aria-hidden="true" />Kapat</button>
                    </div>
                    <nav aria-label="Bölümler" className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
                        {SETTINGS_SECTIONS.map(s => (
                            <button key={s.id} type="button" onClick={() => jump(s.id)} className="h-8 shrink-0 rounded-full border border-border px-3 text-[13px] font-semibold text-foreground hover:bg-muted">{s.label}</button>
                        ))}
                    </nav>
                </div>
                <div ref={bodyRef} className="relative flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-5 py-5 md:px-7">
                    {section('genel-saat', 'Çalışma saatleri', <HoursFields ctx={ctx} idPrefix="g-" />)}
                    {section('genel-iletisim', 'İletişim ve sosyal', (
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            <ContactFields ctx={ctx} idPrefix="g-" withDirections />
                            <RatingFields ctx={ctx} idPrefix="g-" />
                        </div>
                    ))}
                    {section('genel-tasarim', 'Tasarımlar', <DesignFields ctx={ctx} />)}
                    {section('genel-yazi', 'Yazı tipi', <FontFields ctx={ctx} />)}
                    {section('genel-tema', 'Tema ve renk', <ThemeFields ctx={ctx} />)}
                    {section('genel-google', 'Google ve paylaşım', <SeoFields ctx={ctx} live={live} />)}
                    {section('genel-diger', 'Başka sayfalardan gelenler', <ExternalList ctx={ctx} />)}
                </div>
            </div>
        </Modal>
    );
}

// ── Parçalar ────────────────────────────────────────────────────────────────────────────────────

function Dropdown({ onClose, className, children }: { onClose: () => void; className?: string; children: ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.parentElement?.contains(e.target as Node)) onClose(); };
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
    }, [onClose]);
    return (
        <div ref={ref} className={cn('absolute right-0 top-[calc(100%+8px)] z-40 max-w-[90vw] overflow-hidden rounded-xl border border-border bg-card shadow-[0_14px_34px_rgba(42,31,20,0.16)]', className)}>
            {children}
        </div>
    );
}

/**
 * Editörün üst satırının altındaki ince rehber: "Sitenizi güzelleştirin · 6/16", ilerleme, SIRADAKİ tek eksik ve
 * "Ekle" (sekmeye geçer, öğeye kaydırır, vurgular, düzenleyicisini açar). Küçültülünce üst satırda "6/16 ▸" çipi.
 */
function GuideStrip({ done, total, score, action, opensAdmin, onAdd, onAll, onCollapse }: {
    done: number; total: number; score: number; action: string; opensAdmin: boolean;
    onAdd: () => void; onAll: () => void; onCollapse: () => void;
}) {
    return (
        <div className="flex h-10 shrink-0 items-center gap-3 border-b border-border bg-[#FBF6EC] px-4 text-[13px] dark:bg-muted/40">
            <Sparkles className="h-4 w-4 shrink-0 text-rb-gold" aria-hidden="true" />
            <span className="whitespace-nowrap font-semibold text-foreground">Sitenizi güzelleştirin</span>
            <span className="tabular-nums text-muted-foreground">{done}/{total}</span>
            <span className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-border" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={score} aria-label="Sitenin doluluğu">
                <span className="block h-full rounded-full bg-rb-gold" style={{ width: `${score}%` }} />
            </span>
            <span className="ml-2 hidden whitespace-nowrap text-muted-foreground lg:inline">Sıradaki:</span>
            <b className="min-w-0 truncate text-foreground">{action}</b>
            <button type="button" onClick={onAdd} className={cn(ed.btnSm, 'h-7 shrink-0 px-2.5 text-xs')}>{opensAdmin ? 'Git ↗' : 'Ekle'}</button>
            <button type="button" onClick={onAll} className={cn(ed.link, 'shrink-0 whitespace-nowrap')}>Tümünü gör</button>
            <button type="button" onClick={onCollapse} aria-label="Rehberi küçült" title="Küçült" className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
                <ChevronUp className="h-4 w-4" aria-hidden="true" />
            </button>
        </div>
    );
}

function MenuItem({ icon, checked, onClick, children }: { icon: ReactNode; checked?: boolean; onClick: () => void; children: ReactNode }) {
    return (
        <button type="button" onClick={onClick} role={checked === undefined ? 'menuitem' : 'menuitemradio'} aria-checked={checked}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-foreground hover:bg-muted">
            <span aria-hidden="true" className="flex w-4 justify-center text-muted-foreground">{icon}</span>
            <span className="flex-1">{children}</span>
            {checked && <Check className="h-4 w-4 text-foreground" aria-hidden="true" />}
        </button>
    );
}

function ScoreList({ items, onPick, onClose }: { items: SiteCompleteness['items']; onPick: (key: string) => void; onClose?: () => void }) {
    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between gap-2 px-4 pb-1 pt-3">
                <b className="text-[15px]">Sitenizi güzelleştirin</b>
                {onClose && <button type="button" onClick={onClose} className="text-sm font-semibold text-muted-foreground">Kapat</button>}
            </div>
            {items.length === 0 ? (
                <p className="m-0 px-4 pb-4 text-sm font-semibold text-[#1B6A43]">Her şey tamam. Siteniz dolu ve iştah açıcı.</p>
            ) : (
                <ul className="m-0 max-h-[60vh] list-none overflow-y-auto p-0">
                    {items.map(item => (
                        <li key={item.key} className="border-t border-[#EFE8DB] dark:border-border">
                            <button type="button" onClick={() => onPick(item.key)} className="flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left hover:bg-muted">
                                <span className="flex w-full items-baseline justify-between gap-2 text-sm font-semibold text-foreground">
                                    {item.title}{item.detail && <span className="text-xs font-medium text-rb-amber">{item.detail}</span>}
                                </span>
                                <span className="text-[13px] text-muted-foreground">{item.reason}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function StatusPill({ editor, save, conflict, dirty, now, open, onToggle, onRetry, onReload }: {
    editor: NonNullable<ReturnType<typeof useSiteEditor>['editor']>;
    save: ReturnType<typeof useSiteEditor>['save'];
    conflict: boolean; dirty: boolean; now: Date; open: boolean;
    onToggle: () => void; onRetry: () => void; onReload: () => void;
}) {
    const base = 'inline-flex h-8 items-center gap-2 whitespace-nowrap rounded-full px-3 text-[13px] font-semibold';
    if (conflict) {
        return (
            <span className="inline-flex items-center gap-2">
                <span className={cn(base, 'bg-[#FDECE7] text-[#A3301A] dark:bg-rb-red-bg dark:text-rb-red')}><span className="h-2 w-2 rounded-full bg-[#A3301A]" aria-hidden="true" />Başkası da düzenledi</span>
                <button type="button" onClick={onReload} className={cn(ed.btnSm, 'md:hidden')}>Son hâli yükle</button>
            </span>
        );
    }
    if (save.state === 'error' || save.state === 'invalid') {
        return (
            <span className="inline-flex items-center gap-2" role="alert">
                <span className={cn(base, 'bg-[#FDECE7] text-[#A3301A] dark:bg-rb-red-bg dark:text-rb-red')} title={save.message}>
                    <span className="h-2 w-2 rounded-full bg-[#A3301A]" aria-hidden="true" />
                    {save.state === 'error' ? 'Kaydedilemedi' : 'Kaydedilmedi'}
                </span>
                {save.state === 'error' && <button type="button" onClick={onRetry} className={ed.btnSm}>Tekrar dene</button>}
            </span>
        );
    }
    if (editor.hasChanges || dirty) {
        const n = editor.changes.length;
        return (
            <button type="button" onClick={onToggle} aria-expanded={open} disabled={n === 0} title="Yayınlanmamış değişiklikler"
                className={cn(base, 'bg-[#FBEFD6] text-[#7A4E0E] dark:bg-rb-amber-bg dark:text-rb-amber', open && 'shadow-[0_0_0_2px_#E7C98F]')}>
                <span className={ed.dot} aria-hidden="true" />
                {n > 0 ? `${n} değişiklik` : 'Kaydediliyor…'}
                {n > 0 && <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} aria-hidden="true" />}
            </button>
        );
    }
    return (
        <span className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap px-1 text-[13px] font-medium text-muted-foreground"
            title={editor.publishedAt ? `Son yayın ${relativeTime(editor.publishedAt, now)}` : undefined}>
            <span className="h-1.5 w-1.5 rounded-full bg-[#1B6A43]" aria-hidden="true" />Yayında
        </span>
    );
}

function ChangeRows({ changes, busy, onRevert }: { changes: SiteChange[]; busy: boolean; onRevert: (c: SiteChange) => void }) {
    return (
        <ul className="m-0 list-none p-0">
            {changes.map(c => (
                <li key={c.field} className="flex items-center gap-2.5 border-t border-[#EFE8DB] px-3 py-2.5 dark:border-border">
                    <span className="flex flex-1 flex-col">
                        <b className="text-sm">{c.label}</b>
                        <span className="text-[13px] text-muted-foreground">{c.page}</span>
                    </span>
                    <button type="button" disabled={busy} onClick={() => onRevert(c)} className={cn(ed.btnGhost, 'h-[30px] px-2 text-[13px]')}>Geri al</button>
                </li>
            ))}
        </ul>
    );
}

function ChangesSheet({ changes, busy, onRevert, onClose, onDiscard }: {
    changes: SiteChange[]; busy: boolean; onRevert: (c: SiteChange) => void; onClose: () => void; onDiscard: () => void;
}) {
    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between px-5 py-3">
                <b className="text-lg">Değişiklikler</b>
                <button type="button" onClick={onClose} className="text-sm font-semibold text-muted-foreground">Kapat</button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
                {changes.length > 0 ? <ChangeRows changes={changes} busy={busy} onRevert={onRevert} />
                    : <p className="px-5 text-sm text-muted-foreground">Yayınlanmamış değişiklik yok. Müşteriler sitenin şu anki hâlini görüyor.</p>}
            </div>
            {changes.length > 0 && (
                <div className="border-t border-border p-4">
                    <button type="button" disabled={busy} onClick={onDiscard} className={cn(ed.btnGhost, 'w-full text-[#A3301A]')}>Değişiklikleri at</button>
                </div>
            )}
        </div>
    );
}

function DiscardDialog({ open, changes, onCancel, onConfirm }: { open: boolean; changes: SiteChange[]; onCancel: () => void; onConfirm: () => void }) {
    return (
        <Modal open={open} onClose={onCancel} overlayClassName="bg-black/40 backdrop-blur-sm px-4">
            <div className="flex w-full max-w-[460px] flex-col gap-3.5 rounded-2xl border border-border bg-card p-6 shadow-[0_20px_50px_rgba(42,31,20,0.2)]">
                <ModalTitle className="m-0 text-xl font-bold text-foreground">Taslaktaki {changes.length} değişiklik silinsin mi?</ModalTitle>
                <p className="m-0 leading-[1.55] text-muted-foreground">Site son yayınlanan hâline döner. Yüklediğiniz yeni fotoğraflar da silinir. Bu işlem geri alınamaz.</p>
                {changes.length > 0 && (
                    <ul className="m-0 max-h-[200px] list-disc overflow-y-auto pl-[18px] leading-[1.8]">
                        {changes.map(c => <li key={c.field}>{c.label}</li>)}
                    </ul>
                )}
                <div className="flex justify-end gap-2 pt-1.5">
                    <button type="button" onClick={onCancel} className={ed.btn}>Vazgeç</button>
                    <button type="button" onClick={onConfirm} className={ed.btnRed}>Değişiklikleri at</button>
                </div>
            </div>
        </Modal>
    );
}

function PreviewBar({ onBack, onPublish, canPublish, publishing, narrow = false }: {
    onBack: () => void; onPublish: () => void; canPublish: boolean; publishing: boolean; narrow?: boolean;
}) {
    return (
        <div className="flex h-14 shrink-0 items-center gap-3.5 bg-[#1C1510] pl-5 pr-3 text-[#F2EDE4]">
            <Eye className="h-[18px] w-[18px] shrink-0 text-rb-gold" aria-hidden="true" />
            <span className="min-w-0 truncate text-sm"><b>Sitenin tamamı</b>{!narrow && <> · Düzenlenmeyen bölümler de görünür. Yayınla'dan sonra müşteriler böyle görür.</>}</span>
            <div className="ml-auto flex shrink-0 gap-2">
                <button type="button" onClick={onBack} className={cn(ed.btn, 'border-[#4A4038] bg-transparent text-[#F2EDE4] hover:bg-white/10', narrow && 'h-9 px-3')}>
                    {narrow ? 'Düzenle' : 'Düzenlemeye dön'}
                </button>
                <button type="button" disabled={!canPublish} onClick={onPublish} className={cn(ed.btnGold, narrow && 'h-9 px-3')}>
                    {publishing && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}Yayınla
                </button>
            </div>
        </div>
    );
}

function DockButton({ icon, label, onClick, highlight = false }: { icon: ReactNode; label: string; onClick: () => void; highlight?: boolean }) {
    return (
        <button type="button" onClick={onClick} className={cn('flex flex-col items-center justify-center gap-1 px-1 text-center leading-tight', highlight && 'text-[#E7C98F]')}>
            <span aria-hidden="true">{icon}</span>{label}
        </button>
    );
}

/** İlk düzenlemeye kadar önizlemenin altında: 1 Bir yere tıklayın → 2 Değiştirin → 3 Yayınla (kapatılabilir). */
function EditSteps({ onClose }: { onClose: () => void }) {
    const step = (n: number, text: string, gold = false) => (
        <span className="flex items-center gap-1.5">
            <span className={cn('flex h-[22px] w-[22px] items-center justify-center rounded-full text-xs', gold ? 'bg-rb-gold text-[#1C1510]' : 'bg-[#2B7FFF] text-white')}>{n}</span>{text}
        </span>
    );
    return (
        <div role="note" aria-label="Nasıl düzenlenir"
            className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2.5 whitespace-nowrap rounded-full bg-[#1C1510]/90 py-2 pl-4 pr-2 text-sm font-semibold text-[#F2EDE4] shadow-[0_12px_30px_rgba(0,0,0,0.3)]">
            {step(1, 'Bir yere tıklayın')}<span aria-hidden="true" className="text-[#8A7D6E]">→</span>
            {step(2, 'Değiştirin')}<span aria-hidden="true" className="text-[#8A7D6E]">→</span>
            {step(3, 'Yayınla', true)}
            <button type="button" onClick={onClose} aria-label="İpucunu kapat" className="ml-1 flex h-7 w-7 items-center justify-center rounded-full text-[#CFC4B4] hover:bg-white/10 hover:text-white">
                <X className="h-4 w-4" aria-hidden="true" />
            </button>
        </div>
    );
}
