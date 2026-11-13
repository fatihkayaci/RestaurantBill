import { useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { Check, LogOut, Moon, Sun, X } from 'lucide-react';
import { authService } from '@/features/auth/api/authService';
import type { User, WaiterPermissions } from '@/features/users/types';
import { SwitchTrack } from '@/components/ui/switch';

interface Props {
    user: User | null;
    permissions: WaiterPermissions;
    /** Garsonun bölge adları; boş = tüm bölgeler. */
    regionNames: string[];
}

const PERMISSION_ROWS: { key: keyof WaiterPermissions; label: string }[] = [
    { key: 'canTakeOrders', label: 'Masa açma ve sipariş alma' },
    { key: 'canTakePayment', label: 'Ödeme alma' },
    { key: 'canCancelAndDiscount', label: 'İptal, indirim ve ikram' },
    { key: 'canTransferAndReserve', label: 'Masa taşıma, rezervasyon ve QR onayı' },
];

// Garson · Hesabım: kim olduğu, yetkileri, bölgeleri; tema ve çıkış.
export default function WaiterAccount({ user, permissions, regionNames }: Props) {
    const navigate = useNavigate();
    const { resolvedTheme, setTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    const logout = async () => {
        await authService.logout();
        navigate('/login');
    };

    return (
        <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
            <section className="rounded-2xl border border-border bg-card p-4">
                <p className="font-serif text-[26px] font-bold leading-tight text-foreground">{user?.fullName ?? '—'}</p>
                <p className="text-sm text-rb-text-sub">Garson{user?.restaurantName ? ` · ${user.restaurantName}` : ''}{user?.userName ? ` · ${user.userName}` : ''}</p>
            </section>

            <section className="rounded-2xl border border-border bg-card p-4">
                <h2 className="mb-2 text-xs font-bold tracking-widest text-rb-text-sub uppercase">Yetkilerim</h2>
                <ul className="flex flex-col">
                    {PERMISSION_ROWS.map(row => {
                        const on = permissions[row.key];
                        return (
                            <li key={row.key} className="flex min-h-11 items-center gap-3 text-[15px] text-foreground">
                                <span className={`flex size-6 items-center justify-center rounded-full ${on ? 'bg-rb-green-bg text-rb-green' : 'bg-muted text-rb-text-muted'}`} aria-hidden="true">
                                    {on ? <Check className="size-4" strokeWidth={3} /> : <X className="size-4" strokeWidth={3} />}
                                </span>
                                <span className={on ? '' : 'text-rb-text-sub'}>{row.label}</span>
                                <span className="sr-only">{on ? 'açık' : 'kapalı'}</span>
                            </li>
                        );
                    })}
                </ul>
                <p className="mt-2 text-[13px] text-rb-text-sub">Yetkileri yöneticiniz Personel sayfasından değiştirir.</p>
            </section>

            <section className="rounded-2xl border border-border bg-card p-4">
                <h2 className="mb-1.5 text-xs font-bold tracking-widest text-rb-text-sub uppercase">Bölgelerim</h2>
                <p className="text-[15px] text-foreground">{regionNames.length ? regionNames.join(', ') : 'Tüm bölgeler'}</p>
            </section>

            <button
                type="button"
                role="switch"
                aria-checked={isDark}
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                className="flex min-h-14 items-center gap-3 rounded-2xl border border-border bg-card px-4 text-[15px] font-semibold text-foreground"
            >
                {isDark ? <Moon className="size-5" aria-hidden="true" /> : <Sun className="size-5" aria-hidden="true" />}
                <span className="flex-1 text-left">Koyu tema</span>
                <SwitchTrack checked={isDark} onClassName="bg-rb-accent" />
            </button>

            <button
                type="button"
                onClick={logout}
                className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-rb-red/40 bg-card text-[15px] font-bold text-rb-red"
            >
                <LogOut className="size-5" aria-hidden="true" />Çıkış yap
            </button>
        </div>
    );
}
