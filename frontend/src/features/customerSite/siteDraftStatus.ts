import { useEffect, useSyncExternalStore } from 'react';
import { siteEditorService } from './api/siteEditorService';

// Kenar çubuğunda "Restoran sitesi"nin yanındaki turuncu nokta: taslakta yayınlanmamış değişiklik var mı.
// Hafif bir uç olmadığı için kabuk açılınca bir kez GET site/draft çağrılır; düzenleyici her yanıtta değeri günceller.

let hasDraft: boolean | null = null;
let loading = false;
const listeners = new Set<() => void>();

function emit() {
    listeners.forEach(l => l());
}

/** Düzenleyici her sunucu yanıtından sonra çağırır. */
export function setSiteHasDraft(value: boolean) {
    if (hasDraft === value) return;
    hasDraft = value;
    emit();
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}

/** `enabled` false ise (şirket modu) istek atılmaz ve false döner. */
export function useSiteHasDraft(enabled: boolean): boolean {
    const value = useSyncExternalStore(subscribe, () => hasDraft);
    useEffect(() => {
        if (!enabled || hasDraft !== null || loading) return;
        loading = true;
        siteEditorService.get()
            .then(editor => setSiteHasDraft(editor.hasChanges))
            .catch(() => { /* nokta gösterilmez */ })
            .finally(() => { loading = false; });
    }, [enabled]);
    return enabled && value === true;
}
