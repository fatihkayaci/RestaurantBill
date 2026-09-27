import type { ReactNode } from "react";
import PublicNav from "./PublicNav";
import PublicFooter from "./PublicFooter";

interface LegalPageLayoutProps {
    title: string;
    updatedAt: string;
    children: ReactNode;
}

export default function LegalPageLayout({ title, updatedAt, children }: LegalPageLayoutProps) {
    return (
        <div className="min-h-screen bg-[#f5f0e8] dark:bg-[#18140f] text-[#2a1f14] dark:text-[#f2ede4] font-sans flex flex-col">
            <PublicNav />

            <main className="flex-1 px-6 md:px-15 py-16 md:py-20">
                <div className="max-w-165 mx-auto flex flex-col gap-8">
                    <div className="flex flex-col gap-2 border-b border-[#e8e0d0] dark:border-[#3d3528] pb-6">
                        <h1 className="font-serif text-3xl md:text-[42px] font-bold leading-tight">{title}</h1>
                        <p className="text-xs text-[#a39080] dark:text-[#7a6e60]">Son güncelleme: {updatedAt}</p>
                    </div>
                    <div className="flex flex-col gap-8 text-[14px] leading-relaxed text-[#4a3f33] dark:text-[#cfc4b4]">
                        {children}
                    </div>
                </div>
            </main>

            <PublicFooter />
        </div>
    );
}

export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
    return (
        <section className="flex flex-col gap-3">
            <h2 className="font-serif text-xl font-bold text-[#2a1f14] dark:text-[#f2ede4]">{heading}</h2>
            <div className="flex flex-col gap-3">{children}</div>
        </section>
    );
}
