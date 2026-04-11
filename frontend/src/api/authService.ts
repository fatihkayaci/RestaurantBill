import { type Register } from './../features/auths/types';
import { api } from './axiosInstance';

export const authService = {
    logout: () => {
        localStorage.removeItem('token');
    },
    login: async (userName: string, password: string) => {
        const response = await api.post<string>(`/auth/login`, {
            UserName: userName,
            Password: password
        });
        return response.data;
    },
    register: async (request: Register) => {
        const response = await api.post<{ token: string }>(`/auth/register`,{
            FullName: request.fullName,
            UserName: request.userName,
            Email: request.email,
            UserCode: request.userCode,
            Password: request.password,
        });
        return response.data;
    },
};