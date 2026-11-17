import { useState, type ReactNode } from 'react';
import { AlertTriangle, Check, Download } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { inputClass, labelClass } from '@/lib/formStyles';
import { getApiErrorMessage } from '@/lib/apiError';
import { dataManagementService } from '@/features/dataManagement/api/dataManagementService';
import { toggle, type BranchDeletionPreview, type DataBranch, type DataOption, type DataSelection } from '@/features/dataManagement/types';

// "Verileri sil" akışlarının ortak parçaları. Sade: az söz, kırmızı yalnızca son düğmede.

export function StepLabel({ step, total, title }: { step: number; total: number; title: string }) {
    return (
        <p className="text-xs font-semibold tracking-wide text-muted-foreground">
            Adım {step} / {total} · <span className="text-foreground">{title}</span>
        </p>
    );
}

interface CheckRowProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: string;
    hint?: string;
}

export function CheckRow({ checked, onChange, label, hint }: CheckRowProps) {
    return (
        <label className="flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/60">
            <input
                type="checkbox"
                checked={checked}
                onChange={e => onChange(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--rb-gold)]"
            />
            <span className="min-w-0">
                <span className="block text-sm text-foreground">{label}</span>
                {hint && <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>}
            </span>
        </label>
    );
}

export function OptionList({ options, selected, onChange, showHints }: {
    options: DataOption[];
    selected: string[];
    onChange: (next: string[]) => void;
    showHints?: boolean;
}) {
    return (
        <div className="rounded-xl border border-border divide-y divide-border">
            {options.map(o => (
                <CheckRow
                    key={o.key}
                    checked={selected.includes(o.key)}
                    onChange={on => onChange(toggle(selected, o.key, on))}
                    label={o.label}
                    hint={showHints ? o.description : undefined}
                />
            ))}
        </div>
    );
}

/** Şirketin tek şubesi varsa hiç gösterilmez (seçim o şubedir). */
export function BranchPicker({ branches, selected, onChange }: {
    branches: DataBranch[];
    selected: string[];
    onChange: (next: string[]) => void;
}) {
    if (branches.length <= 1) return null;
    return (
        <div className="space-y-2">
            <p className={labelClass}>Şubeler</p>
            <div className="rounded-xl border border-border divide-y divide-border">
                {branches.map(b => (
                    <CheckRow key={b.id} checked={selected.includes(b.id)} onChange={on => onChange(toggle(selected, b.id, on))} label={b.name} />
                ))}
            </div>
        </div>
    );
}

export function PreviewList({ branches, showBranchNames }: { branches: BranchDeletionPreview[]; showBranchNames: boolean }) {
    return (
        <div className="space-y-3">
            {branches.map(b => (
                <div key={b.branchId} className="rounded-xl border border-border">
                    {showBranchNames && <p className="border-b border-border px-4 py-2.5 text-sm font-semibold text-foreground">{b.branchName}</p>}
                    <div className="divide-y divide-border">
                        {b.groups.map(g => (
                            <div key={g.key} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between">
                                <p className="text-sm text-foreground">
                                    {g.label}
                                    {g.dateFiltered && <span className="ml-1.5 text-xs text-muted-foreground">(seçilen tarihten eski)</span>}
                                </p>
                                <p className="text-sm text-muted-foreground tabular-nums">
                                    {g.lines.map(l => `${l.count} ${l.label.toLocaleLowerCase('tr-TR')}`).join(' · ')}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'block'; children: ReactNode }) {
    return (
        <div className={cn(
            'flex gap-2.5 rounded-xl border px-4 py-3 text-sm',
            tone === 'info' && 'border-border bg-muted/50 text-foreground',
            tone === 'warn' && 'border-rb-gold/40 bg-rb-gold/10 text-foreground',
            tone === 'block' && 'border-rb-red/30 bg-rb-red-bg text-foreground',
        )}>
            {tone !== 'info' && <AlertTriangle className={cn('mt-0.5 h-4 w-4 shrink-0', tone === 'block' ? 'text-rb-red' : 'text-rb-gold')} aria-hidden="true" />}
            <div className="min-w-0 space-y-1">{children}</div>
        </div>
    );
}

export function ExportButton({ selection, label = 'CSV olarak indir' }: { selection: DataSelection; label?: string }) {
    const [busy, setBusy] = useState(false);
    const download = async () => {
        setBusy(true);
        try {
            await dataManagementService.exportCsv(selection);
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Dosya hazırlanamadı.'));
        } finally {
            setBusy(false);
        }
    };
    return (
        <button
            type="button"
            onClick={download}
            disabled={busy}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-60"
        >
            <Download className="h-4 w-4" aria-hidden="true" />
            {busy ? 'Hazırlanıyor...' : label}
        </button>
    );
}

export function SecondaryButton({ onClick, children, disabled }: { onClick: () => void; children: ReactNode; disabled?: boolean }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="h-10 rounded-lg border border-border px-4 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-60"
        >
            {children}
        </button>
    );
}

export function PrimaryButton({ onClick, children, disabled }: { onClick: () => void; children: ReactNode; disabled?: boolean }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="h-10 rounded-lg bg-rb-gold px-5 text-sm font-medium text-rb-gold-foreground hover:opacity-90 disabled:opacity-50"
        >
            {children}
        </button>
    );
}

function sameName(a: string, b: string) {
    const norm = (s: string) => s.trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR');
    return norm(a) === norm(b);
}

/** Son adım: restoran adı ve şifre. Kırmızı düğme yalnızca burada. */
export function ConfirmStep({ companyName, actionLabel, busy, error, onBack, onConfirm }: {
    companyName: string;
    actionLabel: string;
    busy: boolean;
    error: string | null;
    onBack: () => void;
    onConfirm: (restaurantName: string, password: string) => void;
}) {
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const ready = sameName(name, companyName) && password.length > 0 && !busy;

    return (
        <form
            className="space-y-4"
            onSubmit={e => { e.preventDefault(); if (ready) onConfirm(name, password); }}
        >
            <div>
                <label className={labelClass} htmlFor="confirm-name">Restoranın adını yazın</label>
                <input
                    id="confirm-name"
                    className={inputClass}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder={companyName}
                    autoComplete="off"
                />
                <p className="mt-1 text-xs text-muted-foreground">Yazmanız gereken: <span className="font-medium text-foreground">{companyName}</span></p>
            </div>
            <div>
                <label className={labelClass} htmlFor="confirm-password">Şifreniz</label>
                <input
                    id="confirm-password"
                    type="password"
                    className={inputClass}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password"
                />
            </div>
            {error && <p role="alert" className="text-sm text-rb-red">{error}</p>}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <SecondaryButton onClick={onBack} disabled={busy}>Geri</SecondaryButton>
                <button
                    type="submit"
                    disabled={!ready}
                    className="h-10 rounded-lg bg-rb-red px-5 text-sm font-semibold text-rb-red-foreground hover:opacity-90 disabled:opacity-40"
                >
                    {busy ? 'İşleniyor...' : actionLabel}
                </button>
            </div>
        </form>
    );
}

export function DoneStep({ title, children, onClose }: { title: string; children?: ReactNode; onClose: () => void }) {
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rb-gold/15">
                    <Check className="h-4 w-4 text-rb-gold" aria-hidden="true" />
                </span>
                <p className="text-sm font-semibold text-foreground">{title}</p>
            </div>
            {children}
            <PrimaryButton onClick={onClose}>Tamam</PrimaryButton>
        </div>
    );
}
