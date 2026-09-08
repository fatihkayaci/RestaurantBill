import type { Code, LoginResponse, Register, RegisterResponse, VerificationCode, VerifyCodeResponse } from '../types';
import { api } from '@/lib/axiosInstance';

export const authService = {
    logout: async () => {
        localStorage.removeItem('token');
        try {
            await api.post('/auth/logout');
        } catch {
            // sessizce yut — local çıkış zaten tamamlandı, refresh cookie'si sunucuda kendi süresinde düşer
        }
    },
    login: async (loginField: string, password: string, rememberMe = false) => {
        const isEmail = loginField.includes('@');
        const response = await api.post<LoginResponse>(`/auth/login`, {
            UserName: isEmail ? undefined : loginField,
            Email: isEmail ? loginField : undefined,
            Password: password,
            RememberMe: rememberMe
        });
        return response.data;
    },
    register: async (request: Register) => {
        const response = await api.post<RegisterResponse>(`/auth/register`, {
            FullName: request.fullName,
            PhoneNumber: request.phoneNumber,
            Email: request.email,
            Password: request.password,
            RestaurantName: request.restaurantName,
        });
        return response.data;
    },
    sendCode: async (request: VerificationCode) => {
        const response = await api.post(`/auth/send-verification-code`, {
            UserId: request.userId,
            Type: request.verificationCodeType
        });
        return response.data;
    },
    verifyCode: async (request: Code) => {
        const response = await api.post<VerifyCodeResponse>(`/auth/verify-code`, {
            UserId: request.userId,
            Code: request.Code,
            Type: request.type
        });
        return response.data;
    },
};
