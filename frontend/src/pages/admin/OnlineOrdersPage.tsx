import { Link } from 'react-router-dom';
import OnlineOrdersBoard from '@/features/delivery/components/OnlineOrdersBoard';
import { settingsPath } from './settings/settingsTabs';

// Yönetici/sahip: online paket siparişler panosu (kasiyer ekranındaki "Paket siparişler" sekmesiyle aynı pano).
// Numara engelleme yalnızca burada (Owner/Admin) açıktır.
export default function OnlineOrdersPage() {
    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-serif font-bold text-foreground">Online siparişler</h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">Sitenizden gelen paket siparişler. Kabul ettiğiniz sipariş mutfağa düşer.</p>
                </div>
                <Link
                    to={settingsPath('online')}
                    className="flex h-10 items-center rounded-[10px] border border-border bg-card px-3.5 text-sm font-semibold text-foreground transition-colors hover:border-rb-gold"
                >
                    Online sipariş ayarları
                </Link>
            </div>
            <OnlineOrdersBoard canBlockPhone className="" />
        </div>
    );
}
