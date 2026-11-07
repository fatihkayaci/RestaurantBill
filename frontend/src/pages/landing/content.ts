import type { LucideIcon } from "lucide-react";
import {
    Building2,
    CalendarClock,
    ChartColumn,
    ChefHat,
    Crown,
    HandPlatter,
    History,
    LayoutDashboard,
    MonitorSmartphone,
    QrCode,
    Radio,
    ShieldCheck,
    Wallet,
    Zap,
} from "lucide-react";

// Sayfadaki her iddia üründe karşılığı olan bir özelliğe dayanır; yeni madde eklerken bunu koru.

export type Tone = "accent" | "green" | "amber" | "purple" | "gold" | "orange";

export const TONE: Record<Tone, { color: string; bg: string }> = {
    accent: { color: "var(--rb-accent)", bg: "var(--rb-accent-bg)" },
    green: { color: "var(--rb-green)", bg: "var(--rb-green-bg)" },
    amber: { color: "var(--rb-amber)", bg: "var(--rb-amber-bg)" },
    purple: { color: "var(--rb-purple)", bg: "var(--rb-purple-bg)" },
    gold: { color: "var(--rb-gold)", bg: "var(--rb-gold-bg)" },
    orange: { color: "var(--rb-orange)", bg: "var(--rb-orange-bg)" },
};

export const NAV_LINKS = [
    { label: "Özellikler", href: "#features" },
    { label: "Nasıl Çalışır", href: "#flow" },
    { label: "Roller", href: "#roles" },
    { label: "Fiyatlandırma", href: "#pricing" },
    { label: "SSS", href: "#faq" },
];

export const HIGHLIGHTS: { icon: LucideIcon; title: string; desc: string }[] = [
    { icon: Zap, title: "Gerçek zamanlı", desc: "Sipariş, mutfak ve kasa aynı anda güncellenir" },
    { icon: MonitorSmartphone, title: "Kurulum yok", desc: "Tablet, telefon veya bilgisayarda tarayıcıdan açılır" },
    { icon: Building2, title: "Çok şubeli", desc: "Tüm şubelerinizi tek hesaptan yönetin" },
    { icon: ShieldCheck, title: "Rol bazlı erişim", desc: "Herkes yalnızca kendi ekranını görür" },
];

export const FLOW_STEPS: { icon: LucideIcon; tone: Tone; who: string; title: string; desc: string }[] = [
    { icon: HandPlatter, tone: "accent", who: "Garson", title: "Siparişi alır", desc: "Masayı seçer, menüden ürünleri ve notları ekleyip gönderir." },
    { icon: ChefHat, tone: "amber", who: "Mutfak", title: "Anında görür", desc: "Sipariş mutfak ekranına sırasıyla düşer; ürünler hazırlandıkça işaretlenir." },
    { icon: Radio, tone: "green", who: "Garson", title: "Hazır bildirimi alır", desc: "Ürün hazır olduğunda masa ekranında görünür, servis edilir." },
    { icon: Wallet, tone: "purple", who: "Kasiyer", title: "Hesabı kapatır", desc: "Nakit, kart veya QR ile tahsil eder; masa otomatik boşalır." },
];

export const FEATURES: { icon: LucideIcon; tone: Tone; title: string; desc: string; points: string[] }[] = [
    {
        icon: LayoutDashboard, tone: "accent", title: "Masa & salon yönetimi",
        desc: "Salonunuzu bölgelere ayırın, masa durumlarını tek bakışta görün.",
        points: ["Boş / dolu / rezerve durumları", "Rezervasyon kaydı", "Masa taşıma, birleştirme, değiştirme"],
    },
    {
        icon: ChefHat, tone: "amber", title: "Mutfak ekranı",
        desc: "Siparişler kâğıda gerek kalmadan, sırasıyla mutfağa ulaşır.",
        points: ["Siparişler geliş sırasıyla", "Ürün bazlı hazır işaretleme", "30 dk'yı geçen siparişlerde uyarı"],
    },
    {
        icon: Wallet, tone: "green", title: "Kasa & ödeme",
        desc: "Hesabı hızlı ve hatasız kapatın.",
        points: ["Nakit, kart ve QR ödeme", "Ürün bazlı bölünmüş ödeme", "Yüzde veya tutar iskonto"],
    },
    {
        icon: CalendarClock, tone: "purple", title: "Vardiya & gün sonu",
        desc: "Kasanın her kuruşu kayıt altında.",
        points: ["Gün başlatma ve kapanış sayımı", "Sayım farkı onay / red akışı", "Şube saatine göre otomatik gün sonu"],
    },
    {
        icon: ChartColumn, tone: "gold", title: "Raporlar",
        desc: "Kararlarınızı tahmine değil veriye dayandırın.",
        points: ["Satış, ürün ve personel raporları", "İskonto ve KDV raporları", "Vardiya bazlı kasa özeti"],
    },
    {
        icon: Building2, tone: "orange", title: "Çok şubeli yapı",
        desc: "Her şube kendi menüsü, masaları, personeli ve kasalarıyla ayrı çalışır.",
        points: ["Şube bazlı admin atama", "Tüm şubeleri tek panelden izleme", "Şubeler arası veri izolasyonu"],
    },
    {
        icon: History, tone: "accent", title: "Denetim kaydı",
        desc: "Kim, ne zaman, ne yaptı — hepsi kayıtlı.",
        points: ["Ödeme, iptal ve iskonto kayıtları", "Personel ve ürün değişiklikleri", "Kişi, tarih ve kategoriye göre filtre"],
    },
    {
        icon: QrCode, tone: "green", title: "Size özel adres",
        desc: "Ekibiniz restoranınıza ait adresten giriş yapar.",
        points: ["restoraniniz.sophram.com", "Personel girişi için QR kod", "Restoran adı ve marka ayarları"],
    },
    {
        icon: Zap, tone: "amber", title: "Canlı senkronizasyon",
        desc: "Ekranlar arasında yenile tuşuna basmaya gerek yok.",
        points: ["Siparişi kim aldı, anında görünür", "Kasa ekranı kendini günceller", "Açık ve koyu tema"],
    },
];

export type Role = {
    key: string;
    icon: LucideIcon;
    tone: Tone;
    name: string;
    tagline: string;
    desc: string;
    points: string[];
};

export const ROLES: Role[] = [
    {
        key: "waiter", icon: HandPlatter, tone: "accent", name: "Garson",
        tagline: "Masada, cebinde.",
        desc: "Telefon veya tabletten masaları görür, siparişi alır ve mutfağa gönderir.",
        points: ["Masa durumu ve açık hesap tutarı", "Kategori filtreli hızlı menü", "Ürün notu ve adet düzenleme", "Hazır ürünleri servis etme", "Rezervasyon kaydı"],
    },
    {
        key: "kitchen", icon: ChefHat, tone: "amber", name: "Mutfak",
        tagline: "Kâğıt fiş yok.",
        desc: "Gelen siparişleri sırasıyla görür, hazırlanan ürünleri işaretler; garson anında haberdar olur.",
        points: ["Bekleyen siparişler tek ekranda", "Ürün bazlı veya toplu hazır işaretleme", "Kategoriye göre filtre (ör. sadece içecekler)", "Bekleme süresi ve gecikme vurgusu", "Masa, sipariş notu ve siparişi alan kişi"],
    },
    {
        key: "cashier", icon: Wallet, tone: "green", name: "Kasiyer",
        tagline: "Hesap saniyeler içinde.",
        desc: "Açık hesapları görür, ödemeyi alır ve kasasını yönetir.",
        points: ["Nakit / kart / QR ödeme", "Ürün bazlı bölünmüş ödeme", "İskonto ve not", "Masa taşıma ve birleştirme", "Gün başlatma ve kapanış sayımı"],
    },
    {
        key: "admin", icon: LayoutDashboard, tone: "purple", name: "Şube Yöneticisi",
        tagline: "Şubenin kontrol paneli.",
        desc: "Menüyü, masaları, personeli ve kasaları yönetir; şubenin raporlarını izler.",
        points: ["Menü, kategori ve KDV oranları", "Bölge ve masa düzeni", "Personel ve yetkiler", "Kasa, vardiya ve gün sonu", "Şube raporları"],
    },
    {
        key: "owner", icon: Crown, tone: "gold", name: "İşletme Sahibi",
        tagline: "Tüm şubeler, tek ekran.",
        desc: "Şubeleri açar, yöneticileri atar ve işletmenin tamamını tek panelden izler.",
        points: ["Şube oluşturma ve düzenleme", "Şube yöneticisi atama", "Tüm şubelerin raporları", "Denetim kaydı", "Marka, adres ve QR ayarları"],
    },
];

export type BillingPeriod = {
    key: "monthly" | "quarterly" | "yearly";
    label: string;
    months: number;
    priceTotal: number;
    priceMonthlyEquivalent: number;
    discountLabel?: string;
};

export const BILLING_PERIODS: BillingPeriod[] = [
    { key: "monthly", label: "Aylık", months: 1, priceTotal: 600, priceMonthlyEquivalent: 600 },
    { key: "quarterly", label: "3 Aylık", months: 3, priceTotal: 1620, priceMonthlyEquivalent: 540, discountLabel: "%10" },
    { key: "yearly", label: "Yıllık", months: 12, priceTotal: 5760, priceMonthlyEquivalent: 480, discountLabel: "%20" },
];

export const PLAN_FEATURES: string[] = [
    "Garson, mutfak ve kasa ekranları",
    "Sınırsız masa, ürün ve personel",
    "Vardiya, gün sonu ve kasa yönetimi",
    "Satış, ürün, personel ve KDV raporları",
    "Rezervasyon ve masa taşıma",
    "Denetim kaydı",
    "Size özel adres ve QR kod",
    "E-posta desteği",
];

export const FAQ: { q: string; a: string }[] = [
    { q: "Ücretsiz deneme süresi var mı?", a: "Evet, 14 gün boyunca tüm özellikleri ücretsiz kullanabilirsiniz. Kredi kartı gerekmez." },
    { q: "Herhangi bir şey kurmam gerekiyor mu?", a: "Hayır. Sophram tarayıcıda çalışır; tablet, telefon veya bilgisayardan adresinize girip kullanmaya başlarsınız." },
    { q: "Birden fazla şubem var, nasıl çalışır?", a: "İşletme sahibi hesabından şubelerinizi açarsınız. Her şubenin menüsü, masaları, personeli ve kasaları ayrıdır; tüm şubeleri tek panelden izlersiniz." },
    { q: "Deneme sonrasında otomatik ücretlendirme olur mu?", a: "Hayır. Deneme süresi bitince siz karar verirsiniz; otomatik yenileme isteğe bağlıdır ve dilediğiniz zaman açıp kapatabilirsiniz." },
    { q: "Faturalama periyodunu değiştirebilir miyim?", a: "Evet, aylık, 3 aylık ve yıllık periyotlar arasında istediğiniz zaman geçiş yapabilirsiniz." },
    { q: "İptal ve iade nasıl işliyor?", a: "Satın alma sonrası 14 gün içinde koşulsuz iade alabilirsiniz; sonrasında kullanılmayan süre için iade yapılır. Ayrıntılar:" },
];
