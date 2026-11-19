import type { ReactNode } from 'react';
import { inputClass, labelClass } from '@/lib/formStyles';
import { cn } from '@/lib/utils';

// Ayarlar sekmelerinin ortak kart/satır parçaları (önceden Online sipariş sayfasının içindeydi).

export function SettingsSkeleton() {
    return <div className="h-64 animate-pulse rounded-2xl bg-muted" aria-busy="true" />;
}

export function SettingsCard({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="space-y-3 rounded-2xl border border-border bg-card p-4 sm:p-5">
            <h2 className={labelClass}>{title}</h2>
            {children}
        </section>
    );
}

export function SettingsRow({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 first-of-type:border-t-0 first-of-type:pt-0">
            <div className="min-w-0 max-w-md">
                <p className="text-sm font-semibold text-foreground">{label}</p>
                {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
            </div>
            {children}
        </div>
    );
}

export function NumberField({ label, hint, value, min, max, disabled, onChange }: {
    label: string; hint?: string; value: number; min: number; max: number; disabled?: boolean; onChange: (value: number) => void;
}) {
    return (
        <SettingsRow label={label} hint={hint}>
            <input
                type="number"
                inputMode="numeric"
                min={min}
                max={max}
                value={Number.isFinite(value) ? value : ''}
                disabled={disabled}
                onChange={e => onChange(e.target.value === '' ? NaN : Number(e.target.value))}
                aria-label={label}
                className={cn(inputClass, 'w-28 py-1.5 tabular-nums disabled:opacity-50')}
            />
        </SettingsRow>
    );
}
