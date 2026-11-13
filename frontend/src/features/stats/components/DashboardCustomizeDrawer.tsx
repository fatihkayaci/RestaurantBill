import { useState } from 'react';
import { ArrowDown, ArrowUp, X } from 'lucide-react';
import { toast } from 'sonner';
import { Modal, ModalTitle } from '@/components/ui/modal';
import { SwitchTrack } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { statsService } from '../api/statsService';
import type { DashboardCardId } from '../types';
import { ALL_CARDS, CARD_META } from '../dashboardCards';

interface Props {
    cards: DashboardCardId[];
    onSaved: (cards: DashboardCardId[]) => void;
    onClose: () => void;
}

// Genel Bakış'ı düzenleme çekmecesi: kart aç/kapat ve sırala. Ayar kullanıcının hesabına kaydedilir.
export default function DashboardCustomizeDrawer({ cards, onSaved, onClose }: Props) {
    const [draft, setDraft] = useState<DashboardCardId[]>(cards);
    const [saving, setSaving] = useState(false);
    const hidden = ALL_CARDS.filter(id => !draft.includes(id));

    const move = (id: DashboardCardId, delta: number) => {
        setDraft(prev => {
            const i = prev.indexOf(id);
            const j = i + delta;
            if (j < 0 || j >= prev.length) return prev;
            const next = [...prev];
            [next[i], next[j]] = [next[j], next[i]];
            return next;
        });
    };
    const toggle = (id: DashboardCardId) =>
        setDraft(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

    const save = async () => {
        setSaving(true);
        try {
            // Varsayılanla aynıysa null gönderilir: katalog ileride değişince kullanıcı yeni varsayılanı alır.
            const isDefault = draft.length === ALL_CARDS.length && draft.every((id, i) => id === ALL_CARDS[i]);
            const saved = await statsService.saveDashboardLayout(isDefault ? null : draft);
            onSaved(saved);
            toast.success('Panel kaydedildi.');
            onClose();
        } catch {
            toast.error('Panel kaydedilemedi.');
            setSaving(false);
        }
    };

    const iconButton = 'flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-muted disabled:opacity-35 disabled:hover:bg-card';

    return (
        <Modal onClose={onClose} overlayClassName="bg-black/45 items-stretch justify-end">
            <div className="flex h-full w-full max-w-[440px] flex-col bg-card shadow-2xl animate-in slide-in-from-right duration-200">
                <div className="flex items-start justify-between gap-3 border-b border-border px-6 pb-4 pt-6">
                    <div>
                        <ModalTitle className="font-serif text-[28px] font-bold leading-tight text-foreground">Paneli düzenle</ModalTitle>
                        <p className="mt-1 text-[13px] text-rb-text-sub">Kartları açıp kapatın, okla sıralayın. Ayar hesabınıza kaydedilir; her cihazda aynı görünür.</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Kapat"
                        className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                        <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                </div>

                <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4">
                    <section className="space-y-2">
                        <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-rb-text-sub">Panelde · {draft.length}</h3>
                        {draft.length === 0 && (
                            <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-sm text-rb-text-sub">Hiç kart seçili değil.</p>
                        )}
                        {draft.map((id, i) => (
                            <div key={id} className="flex min-h-15 items-center gap-2 rounded-xl border border-border bg-background py-2 pl-3 pr-2">
                                <span className="flex min-w-0 flex-1 flex-col">
                                    <span className="text-sm font-semibold text-foreground">{CARD_META[id].title}</span>
                                    <span className="truncate text-xs text-rb-text-sub">{CARD_META[id].hint}</span>
                                </span>
                                <button type="button" aria-label={`${CARD_META[id].title} yukarı taşı`} disabled={i === 0} onClick={() => move(id, -1)} className={iconButton}>
                                    <ArrowUp className="h-4 w-4" aria-hidden="true" />
                                </button>
                                <button type="button" aria-label={`${CARD_META[id].title} aşağı taşı`} disabled={i === draft.length - 1} onClick={() => move(id, 1)} className={iconButton}>
                                    <ArrowDown className="h-4 w-4" aria-hidden="true" />
                                </button>
                                <button type="button" role="switch" aria-checked="true" aria-label={`${CARD_META[id].title} gizle`} onClick={() => toggle(id)} className="flex h-11 items-center px-1">
                                    <SwitchTrack checked onClassName="bg-rb-green" offClassName="bg-black/15" />
                                </button>
                            </div>
                        ))}
                    </section>

                    {hidden.length > 0 && (
                        <section className="space-y-2">
                            <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-rb-text-sub">Eklenebilir kartlar</h3>
                            {hidden.map(id => (
                                <div key={id} className={cn('flex min-h-15 items-center gap-2 rounded-xl border border-dashed border-border py-2 pl-3 pr-2')}>
                                    <span className="flex min-w-0 flex-1 flex-col">
                                        <span className="text-sm font-semibold text-foreground">{CARD_META[id].title}</span>
                                        <span className="truncate text-xs text-rb-text-sub">{CARD_META[id].hint}</span>
                                    </span>
                                    <button type="button" role="switch" aria-checked="false" aria-label={`${CARD_META[id].title} ekle`} onClick={() => toggle(id)} className="flex h-11 items-center px-1">
                                        <SwitchTrack checked={false} onClassName="bg-rb-green" offClassName="bg-rb-text-muted/40" />
                                    </button>
                                </div>
                            ))}
                        </section>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-2 border-t border-border px-6 py-4">
                    <button
                        type="button"
                        onClick={() => setDraft([...ALL_CARDS])}
                        className="h-11 rounded-[10px] border border-border bg-card text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                    >
                        Varsayılana dön
                    </button>
                    <button
                        type="button"
                        onClick={save}
                        disabled={saving}
                        className="h-11 rounded-[10px] bg-rb-gold text-sm font-semibold text-rb-gold-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                    >
                        {saving ? 'Kaydediliyor…' : 'Kaydet'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
