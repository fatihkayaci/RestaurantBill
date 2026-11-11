import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { WifiOff } from 'lucide-react';
import { authService } from '@/features/auth/api/authService';
import { userService } from '@/features/users/api/userService';
import HeaderClock from '@/components/layout/HeaderClock';
import HeaderThemeToggle from '@/components/layout/HeaderThemeToggle';
import HeaderLogoutButton from '@/components/layout/HeaderLogoutButton';
import sophramLogo from '@/assets/sophram-logo-yan.svg';
import { getHubStatus, subscribeHubStatus, type HubStatus } from '@/lib/signalrConnection';
import { cn } from '@/lib/utils';

interface RoleShellProps {
    /** Başlıkta restoran adının altında: "Garson", "Mutfak", "Kasiyer". */
    roleLabel: string;
    /** Garson ekranı uzaktan okunduğu için büyük başlık kullanır. */
    large?: boolean;
    /** Sayfanın portal ile canlı sayaç yerleştirdiği alanın id'si ve görünür olduğu kırılım. */
    statsSlotId?: string;
    statsSlotClassName?: string;
    /** Saatin solunda duran ek eylemler (ör. kasiyerde "Vardiyayı Bitir"). */
    actions?: ReactNode;
    className?: string;
    bodyClassName?: string;
    children: ReactNode;
}

const DOT: Record<HubStatus, { cls: string; label: string }> = {
    idle: { cls: 'bg-rb-green ring-rb-green/15', label: 'Canlı' },
    connecting: { cls: 'bg-rb-amber ring-rb-amber/20', label: 'Bağlanıyor' },
    connected: { cls: 'bg-rb-green ring-rb-green/15', label: 'Canlı bağlantı açık' },
    reconnecting: { cls: 'bg-rb-amber ring-rb-amber/20', label: 'Yeniden bağlanıyor' },
    disconnected: { cls: 'bg-rb-red ring-rb-red/20', label: 'Bağlantı koptu' },
};

// Garson / mutfak / kasiyer ekranlarının ortak başlığı. Nokta gerçek SignalR durumunu gösterir;
// bağlantı koparsa başlığın altında uyarı şeridi çıkar.
export default function RoleShell({
    roleLabel, large = false, statsSlotId, statsSlotClassName, actions, className, bodyClassName, children,
}: RoleShellProps) {
    const navigate = useNavigate();
    const [restaurantName, setRestaurantName] = useState('');
    const hubStatus = useSyncExternalStore(subscribeHubStatus, getHubStatus);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) { navigate('/login'); return; }

        userService.getCurrentUser()
            .then(u => setRestaurantName(u.restaurantName ?? ''))
            .catch(() => {});
    }, [navigate]);

    const handleLogout = () => {
        authService.logout();
        navigate('/login');
    };

    const dot = DOT[hubStatus];
    const offline = hubStatus === 'reconnecting' || hubStatus === 'disconnected';

    return (
        <div className={cn('min-h-screen bg-background flex flex-col', className)}>
            <header className={cn(
                'bg-sidebar flex items-center justify-between gap-3 py-2 shrink-0 z-10',
                large ? 'min-h-16 px-4 sm:px-8' : 'min-h-14 px-3 sm:px-5'
            )}>
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <img src={sophramLogo} alt="Sophram" className="h-12 sm:h-18 w-auto shrink-0" />

                    <div className="hidden sm:block w-px h-6.5 bg-white/10 shrink-0" />

                    <div className="flex items-center gap-1.5 min-w-0">
                        <span
                            role="img"
                            aria-label={dot.label}
                            title={dot.label}
                            className={cn('rounded-full shrink-0 ring-3', large ? 'w-2 h-2' : 'w-1.75 h-1.75', dot.cls)}
                        />
                        <div className="min-w-0">
                            <p className={cn(
                                'text-sidebar-foreground font-serif font-bold leading-tight truncate',
                                large ? 'text-xl sm:text-2xl' : 'text-base'
                            )}>
                                {restaurantName || 'Sophram'}
                            </p>
                            <p className={cn(
                                'text-rb-amber font-semibold tracking-widest uppercase mt-0.5',
                                large ? 'text-xs' : 'text-[10px]'
                            )}>
                                {roleLabel}
                            </p>
                        </div>
                    </div>
                </div>

                {statsSlotId && <div id={statsSlotId} className={cn('items-center gap-0.5', statsSlotClassName)} />}

                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    {actions}
                    <HeaderClock large={large} />
                    <div className="hidden sm:block w-px h-6.5 bg-white/10 shrink-0" />
                    <HeaderThemeToggle large={large} />
                    <HeaderLogoutButton onClick={handleLogout} large={large} />
                </div>
            </header>

            {offline && (
                <div role="status" className="flex items-center justify-center gap-2 bg-rb-red px-4 py-2 text-sm font-semibold text-rb-red-foreground">
                    <WifiOff className="h-4 w-4" aria-hidden="true" />
                    {hubStatus === 'reconnecting'
                        ? 'Bağlantı koptu, yeniden bağlanılıyor. Yeni siparişler gecikebilir.'
                        : 'Canlı bağlantı yok. Sayfayı yenileyin.'}
                </div>
            )}

            <div className={cn('flex-1', bodyClassName)}>
                {children}
            </div>
        </div>
    );
}
