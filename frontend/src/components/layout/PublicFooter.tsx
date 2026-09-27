import { Link } from "react-router-dom";

const LEGAL_LINKS = [
    { label: "Gizlilik Politikası", to: "/gizlilik-politikasi" },
    { label: "Kullanım Koşulları", to: "/kullanim-kosullari" },
    { label: "Mesafeli Satış Sözleşmesi", to: "/mesafeli-satis-sozlesmesi" },
    { label: "İptal & İade", to: "/iptal-ve-iade" },
    { label: "İletişim", to: "/iletisim" },
];

export default function PublicFooter() {
    return (
        <footer className="px-6 md:px-15 py-6 border-t border-white/6 bg-[#1c1510] dark:bg-[#0e0b08]">
            <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                        <span className="font-serif text-[17px] font-bold" style={{ color: "rgba(242,237,228,0.6)" }}>
                            Sophram
                        </span>
                        <span className="text-xs ml-3" style={{ color: "rgba(242,237,228,0.25)" }}>
                            © {new Date().getFullYear()} Sophram — Fatih Kayacı
                        </span>
                    </div>
                    <div className="flex gap-5">
                        <a href="/#pricing" className="text-[13px]" style={{ color: "rgba(242,237,228,0.4)" }}>
                            Fiyatlandırma
                        </a>
                        <Link to="/login" className="text-[13px]" style={{ color: "rgba(242,237,228,0.4)" }}>
                            Giriş Yap
                        </Link>
                    </div>
                </div>

                <div className="flex flex-wrap gap-x-5 gap-y-2 pt-3 border-t border-white/6">
                    {LEGAL_LINKS.map((link) => (
                        <Link
                            key={link.to}
                            to={link.to}
                            className="text-[12px] hover:underline"
                            style={{ color: "rgba(242,237,228,0.35)" }}
                        >
                            {link.label}
                        </Link>
                    ))}
                </div>
            </div>
        </footer>
    );
}
