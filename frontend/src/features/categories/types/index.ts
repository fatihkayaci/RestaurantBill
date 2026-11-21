export interface Category {
    id: string;
    name: string;
    taxRate: number | null;
    effectiveTaxRate: number;
    /** Müşteri menüsündeki görünüm: 0 otomatik (fotoğraf oranına göre), 1 kart, 2 liste. Eski sunucuda yok. */
    menuDisplay?: CategoryMenuDisplay;
}

export type CategoryMenuDisplay = 0 | 1 | 2;
