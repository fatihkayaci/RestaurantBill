import { useState, useSyncExternalStore, type ReactNode } from 'react';
import { useTheme } from 'next-themes';
import { ChevronDown, LogOut, Moon, ShoppingBag, Sun, UserRound, Volume2, VolumeX } from 'lucide-react';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SwitchTrack } from '@/components/ui/switch';
import { staffAlertSound } from '@/lib/staffAlerts';
import { onlineOrderSound } from '@/features/delivery/onlineOrderSound';
import type { SoundToggle } from '@/lib/soundToggle';
import { cn } from '@/lib/utils';
import LogoutConfirmDialog from './LogoutConfirmDialog';

interface Props {
    initials: string;
    displayName: string;
    roleLabel: string;
    avatarClassName: string;
    /** Şirket ("Tümü") modu: profil sayfası ve şube sesleri yok. */
    companyMode: boolean;
    onProfile: () => void;
    onLogout: () => void;
    className?: string;
}

const itemClass = 'min-h-11 gap-2.5 rounded-lg px-2.5 text-sm text-sidebar-foreground/85 focus:bg-white/10 focus:text-sidebar-foreground cursor-pointer';

// Dar üst barda (telefon, tablet, sağ panel açık masaüstü) profil düğmesi bu menüyü açar: profil, bildirim sesleri,
// tema ve çıkış burada. Geniş barda aynı kontroller başlıkta açıkta durur (AppShell, container query ile).
export default function HeaderUserMenu({
    initials, displayName, roleLabel, avatarClassName, companyMode, onProfile, onLogout, className,
}: Props) {
    const [confirmOpen, setConfirmOpen] = useState(false);
    const { resolvedTheme, setTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    return (
        <>
            {/* modal=false: menüden açılan çıkış onayı odağı ve tıklamayı sorunsuz alsın. */}
            <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        aria-label={`Hesap menüsü: ${displayName}`}
                        className={cn(
                            'flex h-11 shrink-0 items-center gap-1 rounded-xl pl-1.5 pr-1 transition-colors hover:bg-white/10 data-[state=open]:bg-white/10',
                            'outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            className
                        )}
                    >
                        <span aria-hidden="true" className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold', avatarClassName)}>
                            {initials}
                        </span>
                        <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 text-sidebar-foreground/60" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    side="bottom"
                    align="end"
                    sideOffset={8}
                    className="w-64 max-w-[calc(100vw-1.5rem)] rounded-2xl border-white/10 bg-[#241D16] p-2 text-sidebar-foreground shadow-2xl"
                >
                    <DropdownMenuLabel className="px-2.5 pb-2 pt-1.5">
                        <span className="block truncate text-sm font-semibold text-sidebar-foreground">{displayName}</span>
                        <span className="block text-xs font-normal text-sidebar-foreground/60">{roleLabel}</span>
                    </DropdownMenuLabel>
                    {!companyMode && (
                        <DropdownMenuItem onSelect={onProfile} className={itemClass}>
                            <UserRound className="h-4 w-4 text-sidebar-foreground/60" aria-hidden="true" />
                            Profil
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator className="my-1 bg-white/10" />
                    {!companyMode && (
                        <>
                            <SoundItem sound={staffAlertSound} attribute="data-staff-alert-sound-toggle" label="Bildirim sesi" icon={null} />
                            <SoundItem
                                sound={onlineOrderSound}
                                attribute="data-online-order-sound-toggle"
                                label="Paket sipariş sesi"
                                icon={<ShoppingBag className="h-4 w-4 text-sidebar-foreground/60" aria-hidden="true" />}
                            />
                        </>
                    )}
                    <DropdownMenuItem
                        role="menuitemcheckbox"
                        aria-checked={isDark}
                        onSelect={e => { e.preventDefault(); setTheme(isDark ? 'light' : 'dark'); }}
                        className={itemClass}
                    >
                        {isDark
                            ? <Moon className="h-4 w-4 text-sidebar-foreground/60" aria-hidden="true" />
                            : <Sun className="h-4 w-4 text-sidebar-foreground/60" aria-hidden="true" />}
                        <span className="flex-1">Koyu tema</span>
                        <SwitchTrack checked={isDark} onClassName="bg-rb-accent" offClassName="bg-white/20" />
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="my-1 bg-white/10" />
                    <DropdownMenuItem
                        onSelect={() => setConfirmOpen(true)}
                        className={cn(itemClass, 'font-semibold text-rb-red focus:bg-rb-red/15 focus:text-rb-red')}
                    >
                        <LogOut className="h-4 w-4" aria-hidden="true" />
                        Çıkış
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <LogoutConfirmDialog open={confirmOpen} onOpenChange={setConfirmOpen} onConfirm={onLogout} />
        </>
    );
}

// Menü içindeki ses anahtarı; seçince menü kapanmaz. Veri özniteliği, "ilk dokunuşta kilidi aç" dinleyicisinin
// bu dokunuşu atlaması için (karar toggle'da).
function SoundItem({ sound, attribute, label, icon }: { sound: SoundToggle; attribute: string; label: string; icon: ReactNode }) {
    const state = useSyncExternalStore(sound.subscribe, sound.getState);
    const on = state !== 'off';
    return (
        <DropdownMenuItem
            role="menuitemcheckbox"
            aria-checked={on}
            {...{ [attribute]: '' }}
            onSelect={e => { e.preventDefault(); sound.toggle(); }}
            title={state === 'locked' ? 'Tarayıcı sesi bekletiyor; açmak için dokunun' : undefined}
            className={itemClass}
        >
            {icon ?? (on
                ? <Volume2 className="h-4 w-4 text-sidebar-foreground/60" aria-hidden="true" />
                : <VolumeX className="h-4 w-4 text-rb-gold" aria-hidden="true" />)}
            <span className="flex min-w-0 flex-1 flex-col leading-tight">
                <span>{label}</span>
                {state === 'locked' && <span className="text-xs text-rb-gold">Tarayıcı bekletiyor, dokunun</span>}
            </span>
            <SwitchTrack checked={on} onClassName="bg-rb-accent" offClassName="bg-white/20" />
        </DropdownMenuItem>
    );
}
