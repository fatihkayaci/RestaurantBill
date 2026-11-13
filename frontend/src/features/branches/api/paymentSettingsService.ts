import { api } from '@/lib/axiosInstance';

/** Oturumdaki şubenin IBAN bilgisi. Boş IBAN: IBAN ile ödeme kapalı. */
export interface BranchPaymentSettings {
    iban: string;
    ibanFormatted: string;
    accountHolderName: string;
}

export const paymentSettingsService = {
    get: async () => {
        const response = await api.get<BranchPaymentSettings>('/branch/payment-settings');
        return response.data;
    },
    /** İkisi de boş gönderilirse IBAN kaldırılır. */
    update: async (iban: string, accountHolderName: string) => {
        const response = await api.put<BranchPaymentSettings>('/branch/payment-settings', {
            Iban: iban,
            AccountHolderName: accountHolderName,
        });
        return response.data;
    },
};
