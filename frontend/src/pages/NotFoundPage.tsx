import { Link } from "react-router-dom";

export default function NotFoundPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f5f0e8] dark:bg-[#18140f] text-[#2a1f14] dark:text-[#f2ede4] font-sans px-6">
            <div className="flex flex-col items-center gap-4 text-center">
                <div className="font-serif text-[64px] font-bold leading-none text-[#C8A96E]">404</div>
                <h1 className="font-serif text-2xl font-bold">Sayfa Bulunamadı</h1>
                <p className="text-sm text-[#a39080] dark:text-[#7a6e60] max-w-95">
                    Aradığınız sayfa taşınmış, silinmiş veya hiç var olmamış olabilir.
                </p>
                <Link
                    to="/"
                    className="mt-2 px-6 py-2.5 rounded-xl bg-[#C8A96E] text-[#1c1510] text-sm font-bold hover:opacity-90 transition-opacity"
                >
                    Ana Sayfaya Dön
                </Link>
            </div>
        </div>
    );
}
