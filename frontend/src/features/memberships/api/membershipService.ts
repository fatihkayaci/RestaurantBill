import type { Membership } from '../types';
import { api } from '@/lib/axiosInstance';

export const membershipService = {
    getMyMembership: async (): Promise<Membership> => {
        const response = await api.get<Membership>(`/membership`);
        return response.data;
    },
};
