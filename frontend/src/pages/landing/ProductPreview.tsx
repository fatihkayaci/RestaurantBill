import { useEffect, useState } from "react";
import { Banknote, Check, CreditCard, QrCode, Timer } from "lucide-react";

// Ürün ekranlarının sadeleştirilmiş, statik bir taklidi. Gerçek veriye bağlı değildir.

const C = {
    text: "rgba(242,237,228,0.92)",
    sub: "rgba(242,237,228,0.5)",
    faint: "rgba(242,237,228,0.08)",
    line: "rgba(255,255,255,0.08)",
    accent: "#5C9FFF",
    green: "#45C87A",
    amber: "#E8B835",
    orange: "#F07840",
    gold: "#C8A96E",
};

type TabKey = "waiter" | "kitchen" | "cashier";

const TABS: { key: TabKey; label: string; color: string }[] = [
    { key: "waiter", label: "Garson", color: C.accent },
    { key: "kitchen", label: "Mutfak", color: C.amber },
    { key: "cashier", label: "Kasa", color: C.green },
];

const CYCLE_MS = 4500;

export default function ProductPreview() {
    const [active, setActive] = useState<TabKey>("waiter");
    const [paused, setPaused] = useState(false);

    useEffect(() => {
        const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        if (paused || reduceMotion) return;
        const id = setInterval(() => {
            setActive((current) => TABS[(TABS.findIndex((t) => t.key === current) + 1) % TABS.length].key);
        }, CYCLE_MS);
        return () => clearInterval(id);
    }, [paused]);

    return (
        <div
            className="rounded-2xl overflow-hidden border border-white/10 shadow-[0_32px_80px_rgba(0,0,0,0.55)]"
            style={{ background: "#0E0B08" }}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
        >
            <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 border-b" style={{ borderColor: C.line }}>
                <div className="flex gap-1.5" aria-hidden>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
                </div>
                <div className="flex gap-1" role="tablist" aria-label="Ekran önizlemesi">
                    {TABS.map((tab) => {
                        const selected = tab.key === active;
                        return (
                            <button
                                key={tab.key}
                                type="button"
                                role="tab"
                                aria-selected={selected}
                                onClick={() => setActive(tab.key)}
                                className="px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors"
                                style={{
                                    background: selected ? `${tab.color}26` : "transparent",
                                    color: selected ? tab.color : C.sub,
                                }}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: C.green }} />
                    <span className="text-[10px]" style={{ color: C.sub }}>Canlı</span>
                </div>
            </div>

            <div className="h-80 sm:h-84 p-3 overflow-hidden" role="tabpanel">
                <div key={active} className="h-full animate-in fade-in duration-500">
                    {active === "waiter" && <WaiterMock />}
                    {active === "kitchen" && <KitchenMock />}
                    {active === "cashier" && <CashierMock />}
                </div>
            </div>
        </div>
    );
}

const TABLES = [
    { name: "Masa 1", status: "Dolu", amount: "₺640", since: "42 dk", color: C.orange },
    { name: "Masa 2", status: "Boş", color: C.green },
    { name: "Masa 3", status: "Dolu", amount: "₺385", since: "18 dk", note: "● 2 ürün hazır", color: C.orange },
    { name: "Masa 4", status: "Rezerve", note: "20:30 · 4 kişi", color: C.amber },
    { name: "Masa 5", status: "Dolu", amount: "₺1.120", since: "1 sa 5 dk", color: C.orange },
    { name: "Masa 6", status: "Boş", color: C.green },
    { name: "Bahçe 1", status: "Dolu", amount: "₺290", since: "9 dk", color: C.orange },
    { name: "Bahçe 2", status: "Boş", color: C.green },
    { name: "Bahçe 3", status: "Rezerve", note: "21:00 · 2 kişi", color: C.amber },
];

function WaiterMock() {
    return (
        <div className="h-full flex flex-col gap-2.5">
            <div className="flex items-center gap-3 text-[10px]" style={{ color: C.sub }}>
                <span><b style={{ color: C.text }}>9</b> masa</span>
                <span><b style={{ color: C.green }}>3</b> boş</span>
                <span><b style={{ color: C.orange }}>4</b> dolu</span>
                <span><b style={{ color: C.amber }}>2</b> rezerve</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 flex-1">
                {TABLES.map((t) => (
                    <div
                        key={t.name}
                        className="rounded-lg px-2.5 py-2 flex flex-col gap-0.5 min-w-0"
                        style={{ background: `${t.color}14`, border: `1px solid ${t.color}40` }}
                    >
                        <div className="flex items-center justify-between gap-1">
                            <span className="font-serif text-[13px] font-bold truncate" style={{ color: C.text }}>{t.name}</span>
                            <span className="text-[8px] font-bold uppercase tracking-wide shrink-0" style={{ color: t.color }}>{t.status}</span>
                        </div>
                        {t.amount && <span className="font-serif text-[13px] font-bold" style={{ color: C.text }}>{t.amount}</span>}
                        {t.since && <span className="text-[9px]" style={{ color: C.sub }}>{t.since}</span>}
                        {t.note && <span className="text-[9px] mt-auto" style={{ color: t.color }}>{t.note}</span>}
                    </div>
                ))}
            </div>
        </div>
    );
}

const KITCHEN_COLUMNS = [
    {
        label: "Bekliyor", color: C.amber, orders: [
            { table: "Masa 5", time: "34 dk", urgent: true, items: ["2× Adana Kebap", "1× Çoban Salata"] },
            { table: "Bahçe 1", time: "4 dk", items: ["1× Mercimek Çorbası"] },
        ],
    },
    {
        label: "Hazırlanıyor", color: C.orange, orders: [
            { table: "Masa 1", time: "12 dk", items: ["1× Izgara Köfte", "2× Ayran"] },
        ],
    },
    {
        label: "Hazır", color: C.green, orders: [
            { table: "Masa 3", time: "18 dk", items: ["1× Lahmacun", "1× Künefe"] },
        ],
    },
];

function KitchenMock() {
    return (
        <div className="h-full grid grid-cols-2 sm:grid-cols-3 gap-2">
            {KITCHEN_COLUMNS.map((col) => (
                // Dar ekranlarda orta kolon gizlenir; üç kolon telefonda okunamayacak kadar daralıyor.
                <div
                    key={col.label}
                    className={`rounded-lg p-2 flex-col gap-2 min-w-0 ${col.label === "Hazırlanıyor" ? "hidden sm:flex" : "flex"}`}
                    style={{ background: C.faint }}
                >
                    <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: col.color }} />
                        <span className="text-[10px] font-bold truncate" style={{ color: col.color }}>{col.label}</span>
                        <span className="ml-auto text-[10px]" style={{ color: C.sub }}>{col.orders.length}</span>
                    </div>
                    {col.orders.map((o) => (
                        <div
                            key={o.table}
                            className="rounded-md p-2 flex flex-col gap-1"
                            style={{ background: "#1A1510", border: `1px solid ${o.urgent ? "#F0606080" : C.line}` }}
                        >
                            <div className="flex items-center justify-between gap-1">
                                <span className="font-serif text-[12px] font-bold truncate" style={{ color: C.text }}>{o.table}</span>
                                <span className="flex items-center gap-0.5 text-[9px] shrink-0" style={{ color: o.urgent ? "#F06060" : C.sub }}>
                                    <Timer size={9} />{o.time}
                                </span>
                            </div>
                            {o.items.map((i) => (
                                <span key={i} className="text-[10px] leading-tight truncate" style={{ color: C.sub }}>{i}</span>
                            ))}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}

const BILL_LINES = [
    { name: "Adana Kebap", qty: 2, price: 640 },
    { name: "Çoban Salata", qty: 1, price: 110 },
    { name: "Künefe", qty: 2, price: 300 },
    { name: "Ayran", qty: 3, price: 105 },
];

function CashierMock() {
    const subtotal = BILL_LINES.reduce((s, l) => s + l.price, 0);
    const discount = 115;
    const fmt = (n: number) => `₺${n.toLocaleString("tr-TR")}`;
    return (
        <div className="h-full grid grid-cols-5 gap-2">
            <div className="col-span-3 rounded-lg p-2.5 flex flex-col gap-1.5 min-w-0" style={{ background: C.faint }}>
                <div className="flex items-center justify-between">
                    <span className="font-serif text-[14px] font-bold" style={{ color: C.text }}>Masa 5</span>
                    <span className="text-[9px]" style={{ color: C.sub }}>Alan: Ayşe</span>
                </div>
                {BILL_LINES.map((l) => (
                    <div key={l.name} className="flex items-center gap-1.5 text-[10px]">
                        <span className="w-3.5 h-3.5 rounded flex items-center justify-center shrink-0" style={{ background: `${C.green}26`, color: C.green }}>
                            <Check size={9} strokeWidth={3} />
                        </span>
                        <span className="truncate" style={{ color: C.text }}>{l.qty}× {l.name}</span>
                        <span className="ml-auto shrink-0" style={{ color: C.sub }}>{fmt(l.price)}</span>
                    </div>
                ))}
                <div className="mt-auto pt-1.5 border-t flex flex-col gap-0.5 text-[10px]" style={{ borderColor: C.line }}>
                    <div className="flex justify-between" style={{ color: C.sub }}><span>Ara toplam</span><span>{fmt(subtotal)}</span></div>
                    <div className="flex justify-between" style={{ color: C.gold }}><span>İskonto %10</span><span>−{fmt(discount)}</span></div>
                    <div className="flex justify-between font-bold text-[12px]" style={{ color: C.text }}><span>Toplam</span><span>{fmt(subtotal - discount)}</span></div>
                </div>
            </div>
            <div className="col-span-2 flex flex-col gap-1.5 min-w-0">
                {[
                    { icon: Banknote, label: "Nakit", on: true },
                    { icon: CreditCard, label: "Kart" },
                    { icon: QrCode, label: "QR" },
                ].map(({ icon: Icon, label, on }) => (
                    <div
                        key={label}
                        className="rounded-lg px-2.5 py-2 flex items-center gap-2 text-[11px] font-semibold"
                        style={{
                            background: on ? `${C.green}22` : C.faint,
                            border: `1px solid ${on ? `${C.green}66` : "transparent"}`,
                            color: on ? C.green : C.sub,
                        }}
                    >
                        <Icon size={13} />{label}
                    </div>
                ))}
                <div className="mt-auto rounded-lg py-2.5 text-center text-[11px] font-bold" style={{ background: C.green, color: "#0E0B08" }}>
                    Ödemeyi Al
                </div>
            </div>
        </div>
    );
}
