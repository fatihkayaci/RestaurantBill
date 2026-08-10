import { useEffect, useState } from 'react';

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

const pad = (n: number) => String(n).padStart(2, '0');

export default function HeaderClock() {
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 30_000);
        return () => clearInterval(id);
    }, []);

    return (
        <div className="hidden lg:flex flex-col items-end gap-0.5">
            <span className="font-serif text-lg font-bold leading-none text-sidebar-foreground">
                {pad(now.getHours())}:{pad(now.getMinutes())}
            </span>
            <span className="text-[9.5px] text-sidebar-foreground/40 whitespace-nowrap">
                {now.getDate()} {MONTHS[now.getMonth()]} · {DAYS[now.getDay()]}
            </span>
        </div>
    );
}
