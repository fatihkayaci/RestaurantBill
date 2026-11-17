import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { SiteDraftConflictError, siteEditorService, type SiteDraftTexts } from '@/features/customerSite/api/siteEditorService';
import type { SiteEditor } from '@/features/customerSite/types';
import { setSiteHasDraft } from '@/features/customerSite/siteDraftStatus';
import { getApiErrorMessage } from '@/lib/apiError';
import { textsProblem, toSaveBody, toTexts } from './editorModel';

// Düzenleyicinin durumu ve sunucuyla konuşması (docs/site-editor.md):
// - Yazılar yerelde anında değişir (önizleme hemen güncellenir); kısa bir beklemeden sonra taslağa TAM yazım gider.
// - Bütün yazmalar (yazı, fotoğraf, geri al, yayınla, at) tek kuyrukta sırayla gider ve her istek son yanıtın sürümünü
//   kullanır: fotoğraf uçları sürüm denetlemez ama artırır, sıra karışırsa kendi oturumumuzla çatışırdık.
// - 409: "Başkası da düzenledi". Otomatik kayıt durur; "Son hâli yükle" sunucunun hâlini alır.

const SAVE_DELAY_MS = 700;

export type SaveStatus =
    | { state: 'idle' }
    | { state: 'pending' }
    | { state: 'saving' }
    | { state: 'invalid'; message: string }
    | { state: 'error'; message: string };

type Busy = string | null;

export function useSiteEditor() {
    const [editor, setEditor] = useState<SiteEditor | null>(null);
    const [texts, setTexts] = useState<SiteDraftTexts | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [save, setSave] = useState<SaveStatus>({ state: 'idle' });
    const [conflict, setConflict] = useState<SiteEditor | null>(null);
    const [busy, setBusy] = useState<Busy>(null);
    const [action, setAction] = useState<'publish' | 'discard' | 'revert' | null>(null);

    const versionRef = useRef(0);
    const textsRef = useRef<SiteDraftTexts | null>(null);
    /** Her yerel yazı değişikliğinde artar; kaydedilen sürümle karşılaştırılır. */
    const revisionRef = useRef(0);
    const savedRevisionRef = useRef(0);
    const queueRef = useRef<Promise<unknown>>(Promise.resolve());
    const timerRef = useRef<number | undefined>(undefined);
    const conflictRef = useRef(false);

    const adopt = useCallback((next: SiteEditor, takeTexts: boolean) => {
        versionRef.current = next.version;
        setEditor(next);
        setSiteHasDraft(next.hasChanges);
        if (takeTexts) {
            const t = toTexts(next.draft);
            textsRef.current = t;
            setTexts(t);
            savedRevisionRef.current = revisionRef.current;
            setSave({ state: 'idle' });
        }
    }, []);

    const fetchEditor = useCallback(() => {
        siteEditorService.get()
            .then(next => { setLoadError(null); adopt(next, true); })
            .catch(err => setLoadError(getApiErrorMessage(err, 'Site düzenleyicisi yüklenemedi.')));
    }, [adopt]);

    useEffect(() => { fetchEditor(); }, [fetchEditor]);

    const load = useCallback(() => {
        setLoadError(null);
        fetchEditor();
    }, [fetchEditor]);

    /** Kuyruğa ekler: önceki iş bitmeden (başarılı ya da değil) başlamaz. */
    const enqueue = useCallback(<T,>(task: () => Promise<T>): Promise<T> => {
        const run = queueRef.current.then(task, task);
        queueRef.current = run.catch(() => undefined);
        return run;
    }, []);

    const onConflict = useCallback((err: unknown): boolean => {
        if (!(err instanceof SiteDraftConflictError)) return false;
        conflictRef.current = true;
        setConflict(err.editor);
        setSave({ state: 'idle' });
        return true;
    }, []);

    const runSave = useCallback(() => enqueue(async () => {
        const current = textsRef.current;
        if (conflictRef.current || !current) return;
        const rev = revisionRef.current;
        if (rev === savedRevisionRef.current) return;
        const problem = textsProblem(current);
        if (problem) {
            setSave({ state: 'invalid', message: problem });
            return;
        }
        setSave({ state: 'saving' });
        try {
            const next = await siteEditorService.save(versionRef.current, toSaveBody(current));
            savedRevisionRef.current = rev;
            // Yazılar yerelde kalır (bu arada yazılmış olabilir); sürüm, fotoğraflar ve değişiklik listesi sunucudan.
            adopt(next, false);
            setSave(revisionRef.current === rev ? { state: 'idle' } : { state: 'pending' });
        } catch (err) {
            if (onConflict(err)) return;
            setSave({ state: 'error', message: getApiErrorMessage(err, 'Taslak kaydedilemedi.') });
        }
    }), [adopt, enqueue, onConflict]);

    const schedule = useCallback(() => {
        window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => { void runSave(); }, SAVE_DELAY_MS);
    }, [runSave]);

    /** Bekleyen yazı kaydını hemen kuyruğa koyar (yayınla, at, geri al öncesi). */
    const flush = useCallback(() => {
        window.clearTimeout(timerRef.current);
        return runSave();
    }, [runSave]);

    const updateTexts = useCallback((change: (t: SiteDraftTexts) => SiteDraftTexts) => {
        const current = textsRef.current;
        if (!current) return;
        const next = change(current);
        textsRef.current = next;
        setTexts(next);
        revisionRef.current += 1;
        if (!conflictRef.current) {
            setSave({ state: 'pending' });
            schedule();
        }
    }, [schedule]);

    /** Fotoğraf işlemi: sürüm denetlemez, yine de kuyruktan geçer (sürümü artırır). */
    const runPhoto = useCallback((key: string, call: () => Promise<SiteEditor>, failure = 'Fotoğraf değiştirilemedi.') => {
        void flush();
        return enqueue(async () => {
            if (conflictRef.current) return false;
            setBusy(key);
            try {
                adopt(await call(), false);
                return true;
            } catch (err) {
                toast.error(getApiErrorMessage(err, failure));
                return false;
            } finally {
                setBusy(null);
            }
        });
    }, [adopt, enqueue, flush]);

    /** Sürüm taşıyan işlem (geri al, yayınla, at): önce bekleyen yazılar kaydedilir. */
    const runVersioned = useCallback((kind: 'publish' | 'discard' | 'revert', call: (version: number) => Promise<SiteEditor>, failure: string) => {
        void flush();
        return enqueue(async () => {
            if (conflictRef.current) return false;
            setAction(kind);
            try {
                const next = await call(versionRef.current);
                // Bekleyen yerel yazı yoksa yazılar sunucudan alınır (geri alınan alan, atılan taslak).
                const clean = revisionRef.current === savedRevisionRef.current;
                adopt(next, clean || kind === 'discard');
                return true;
            } catch (err) {
                if (!onConflict(err)) toast.error(getApiErrorMessage(err, failure));
                return false;
            } finally {
                setAction(null);
            }
        });
    }, [adopt, enqueue, flush, onConflict]);

    const revert = useCallback((fields: string[]) =>
        runVersioned('revert', v => siteEditorService.revert(v, fields), 'Geri alınamadı.'), [runVersioned]);
    const publish = useCallback(() =>
        runVersioned('publish', v => siteEditorService.publish(v), 'Site yayınlanamadı.'), [runVersioned]);
    const discard = useCallback(() =>
        runVersioned('discard', v => siteEditorService.discard(v), 'Değişiklikler atılamadı.'), [runVersioned]);

    /** 409 sonrası: sunucudaki son hâli al, otomatik kaydı yeniden aç. */
    const reloadAfterConflict = useCallback(() => {
        const latest = conflict;
        conflictRef.current = false;
        setConflict(null);
        window.clearTimeout(timerRef.current);
        if (latest) adopt(latest, true);
        else load();
    }, [adopt, conflict, load]);

    const retrySave = useCallback(() => {
        savedRevisionRef.current = -1;
        void flush();
    }, [flush]);

    // Sayfadan çıkarken bekleyen yazı kaybolmasın: hemen gönderilir; tarayıcı kapanıyorsa uyarı.
    useEffect(() => {
        const onBeforeUnload = (e: BeforeUnloadEvent) => {
            if (revisionRef.current !== savedRevisionRef.current && !conflictRef.current) e.preventDefault();
        };
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', onBeforeUnload);
            if (revisionRef.current !== savedRevisionRef.current) void flush();
        };
    }, [flush]);

    const dirty = save.state === 'pending' || save.state === 'saving' || save.state === 'invalid';

    return {
        editor, texts, loadError, load, save, conflict, busy, action, dirty,
        updateTexts, runPhoto, revert, publish, discard, flush, reloadAfterConflict, retrySave,
    };
}

export type SiteEditorState = ReturnType<typeof useSiteEditor>;
