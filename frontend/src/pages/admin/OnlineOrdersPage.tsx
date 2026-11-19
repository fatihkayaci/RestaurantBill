import OnlineOrdersBoard from '@/features/delivery/components/OnlineOrdersBoard';
import { settingsPath } from './settings/settingsTabs';

// Yönetici/sahip: online paket siparişler panosu (kasiyer ekranındaki "Paket siparişler" sekmesiyle aynı pano).
// Başlık, bugünün özeti ve "Ayarlar" bağlantısı panonun üst satırında. Numara engelleme yalnızca burada (Owner/Admin) açıktır.
export default function OnlineOrdersPage() {
    return <OnlineOrdersBoard canBlockPhone className="" title="Online siparişler" settingsHref={settingsPath('online')} />;
}
