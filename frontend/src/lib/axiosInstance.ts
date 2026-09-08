import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { getTenantSlug } from './tenant';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5077';

export const api = axios.create({
    baseURL: `${API_BASE_URL}/api`,
    timeout: 5000,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json'
    }
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    const slug = getTenantSlug();
    if (slug) {
        config.headers['X-Restaurant-Slug'] = slug;
    }

    return config;
});

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
    _retry?: boolean;
}

// Eş zamanlı isteklerin hepsi 401 aldığında tek bir /auth/refresh çağrısı gitsin diye
// (rotation varken paralel refresh'ler birbirini revoke edip reuse detection'ı tetikler).
let refreshPromise: Promise<string | null> | null = null;

export function refreshAccessToken(): Promise<string | null> {
    if (!refreshPromise) {
        refreshPromise = axios
            .post<{ token: string }>(`${API_BASE_URL}/api/auth/refresh`, null, { withCredentials: true })
            .then((response) => {
                const newToken = response.data.token;
                localStorage.setItem('token', newToken);
                return newToken;
            })
            .catch(() => {
                localStorage.removeItem('token');
                return null;
            })
            .finally(() => {
                refreshPromise = null;
            });
    }

    return refreshPromise;
}

export function redirectToLogin() {
    localStorage.removeItem('token');
    if (window.location.pathname !== '/login') {
        window.location.assign('/login');
    }
}

api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as RetryableRequestConfig | undefined;

        if (error.response?.status !== 401 || !originalRequest) {
            return Promise.reject(error);
        }

        if (originalRequest._retry) {
            redirectToLogin();
            return Promise.reject(error);
        }
        originalRequest._retry = true;

        const newToken = await refreshAccessToken();

        if (!newToken) {
            redirectToLogin();
            return Promise.reject(error);
        }

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
    }
);
