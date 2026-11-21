import { createContext, useContext } from 'react';

// Restoranın adı ve logosu: başlıktaki marka işareti ve fotoğrafı olmayan ürünlerin yer tutucusu (QrImage) okur.
// TableOrderPage sağlar; her karta ayrı ayrı geçirilmez.

export interface QrBrand {
    name: string;
    /** Sitenin logosu (tam adres); yoksa boş. */
    logoUrl: string;
}

export const QrBrandContext = createContext<QrBrand>({ name: '', logoUrl: '' });

export const useQrBrand = () => useContext(QrBrandContext);
