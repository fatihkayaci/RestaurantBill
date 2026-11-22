import { Landmark, type LucideIcon } from 'lucide-react';

// Hesabım'daki "Ödeme" bölümünün yöntemleri. Bölüm bu listeden çizilir; liste boşsa bölüm hiç görünmez.
// Yeni yöntem (ör. online kart) eklemek için: aşağıdaki girdilere yeni bir alan ekleyip yöntem kullanılabilirken
// listeye bir satır daha koymak yeter; Hesabım ekranında başka değişiklik gerekmez.

export interface QrPaymentMethod {
    id: string;
    title: string;
    description: string;
    icon: LucideIcon;
    onSelect: () => void;
}

export interface QrPaymentOptions {
    /** Şubede IBAN tanımlıysa IBAN sayfasını açar; yoksa null. */
    onIban: (() => void) | null;
    // onCard: (() => void) | null;  ← ileride online kart
}

export function buildPaymentMethods({ onIban }: QrPaymentOptions): QrPaymentMethod[] {
    const methods: QrPaymentMethod[] = [];
    if (onIban) {
        methods.push({
            id: 'iban', title: 'IBAN ile öde', description: 'Havale / EFT ile ödeyin, dekontu garsona gösterin.',
            icon: Landmark, onSelect: onIban,
        });
    }
    return methods;
}
