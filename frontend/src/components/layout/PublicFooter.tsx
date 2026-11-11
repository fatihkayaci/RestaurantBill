import { Link } from "react-router-dom";

const PRODUCT_LINKS = [
    { label: "Özellikler", href: "/#features" },
    { label: "Nasıl Çalışır", href: "/#flow" },
    { label: "Fiyatlandırma", href: "/#pricing" },
    { label: "SSS", href: "/#faq" },
];

const LEGAL_LINKS = [
    { label: "Gizlilik Politikası", to: "/gizlilik-politikasi" },
    { label: "Kullanım Koşulları", to: "/kullanim-kosullari" },
    { label: "Mesafeli Satış Sözleşmesi", to: "/mesafeli-satis-sozlesmesi" },
    { label: "İptal & İade", to: "/iptal-ve-iade" },
    { label: "İletişim", to: "/iletisim" },
];

const linkClass = "text-[13px] text-[rgba(242,237,228,0.6)] hover:text-[#f2ede4] transition-colors";

export default function PublicFooter() {
    return (
        <footer className="px-5 sm:px-8 lg:px-15 pt-12 pb-8 border-t border-white/8 bg-[#1c1510] dark:bg-[#0e0b08] text-[#f2ede4]">
            <div className="max-w-300 mx-auto grid grid-cols-1 sm:grid-cols-[1.5fr_1fr_1fr] gap-10">
                <div className="flex flex-col gap-3 max-w-xs">
                    <span className="font-serif text-2xl font-bold">Sophram</span>
                    <p className="text-[13px] leading-relaxed text-[rgba(242,237,228,0.55)]">
                        Garson, mutfak, kasa ve yönetim için gerçek zamanlı restoran yönetim sistemi.
                    </p>
                    <Link to="/login" className="self-start mt-1 text-[13px] font-semibold text-rb-gold hover:underline underline-offset-4">
                        Giriş Yap →
                    </Link>
                </div>

                <div className="flex flex-col gap-2.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[rgba(242,237,228,0.4)] mb-1">Ürün</span>
                    {PRODUCT_LINKS.map((link) => (
                        <a key={link.href} href={link.href} className={linkClass}>
                            {link.label}
                        </a>
                    ))}
                </div>

                <div className="flex flex-col gap-2.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[rgba(242,237,228,0.4)] mb-1">Yasal</span>
                    {LEGAL_LINKS.map((link) => (
                        <Link key={link.to} to={link.to} className={linkClass}>
                            {link.label}
                        </Link>
                    ))}
                </div>
            </div>

            <div className="max-w-300 mx-auto mt-10 pt-6 border-t border-white/8 text-xs text-[rgba(242,237,228,0.45)]">
                © {new Date().getFullYear()} Sophram — Fatih Kayacı
            </div>
        </footer>
    );
}
