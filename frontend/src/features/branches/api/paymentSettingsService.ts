import { api } from '@/lib/axiosInstance';

/** Oturumdaki şubenin IBAN bilgisi. Boş IBAN: IBAN ile ödeme kapalı. */
export interface BranchPaymentSettings {
    iban: string;
    ibanFormatted: string;
    accountHolderName: string;
    /** İsteğe bağlı. */
    bankName: string;
    /** Masa QR sayfasında "IBAN ile öde" görünsün mü (varsayılan kapalı). */
    showIbanOnTable: boolean;
}

export interface BranchPaymentSettingsUpdate {
    iban: string;
    accountHolderName: string;
    bankName: string;
    showIbanOnTable: boolean;
}

export const paymentSettingsService = {
    get: async () => {
        const response = await api.get<BranchPaymentSettings>('/branch/payment-settings');
        return response.data;
    },
    /** IBAN ve hesap sahibi ikisi de boş gönderilirse IBAN kaldırılır (QR gösterimi de kapanır). */
    update: async (settings: BranchPaymentSettingsUpdate) => {
        const response = await api.put<BranchPaymentSettings>('/branch/payment-settings', {
            Iban: settings.iban,
            AccountHolderName: settings.accountHolderName,
            BankName: settings.bankName,
            ShowIbanOnTable: settings.showIbanOnTable,
        });
        return response.data;
    },
};
